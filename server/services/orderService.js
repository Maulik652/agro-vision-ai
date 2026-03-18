/**
 * Order Service — Multi-farmer order splitting logic
 * One checkout session → N sub-orders (one per farmer)
 * Payment is single; escrow holds until each order completes.
 */
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";
import Address from "../models/Address.js";
import CropListing from "../models/CropListing.js";
import { deleteCache } from "../config/redis.js";
import { emitAnalyticsUpdate } from "../realtime/analyticsNamespace.js";
import { emitStockUpdate, emitInventoryUpdate, getSocketServer, emitOrderUpdate } from "../realtime/socketServer.js";

const PLATFORM_FEE_RATE = 0.015; // 1.5%
const TAX_RATE          = 0.05;  // 5%
const BASE_DELIVERY_STD = 50;    // ₹ standard base
const BASE_DELIVERY_EXP = 120;   // ₹ express base
const DELIVERY_PER_KG   = 2;     // ₹/kg

/** Estimate delivery days */
const deliveryDays = (type) => (type === "express" ? 2 : 5);

/** Calculate delivery cost for a group of items */
const calcDelivery = (items, type) => {
  const base   = type === "express" ? BASE_DELIVERY_EXP : BASE_DELIVERY_STD;
  const weight = items.reduce((s, i) => s + i.quantity, 0);
  return +(base + weight * DELIVERY_PER_KG).toFixed(2);
};

/**
 * Build checkout summary from cart — used for preview before placing order.
 * Returns grouped items, per-farmer breakdown, and grand total.
 */
export const buildCheckoutSummary = async (buyerId, deliveryType = "standard") => {
  const cart = await Cart.findOne({ buyer: buyerId });
  if (!cart || !cart.items.length) {
    throw Object.assign(new Error("Cart is empty"), { status: 400 });
  }

  // Group cart items by farmer
  const farmerMap = {};
  for (const item of cart.items) {
    const fid = item.farmerId.toString();
    if (!farmerMap[fid]) {
      farmerMap[fid] = { farmerId: fid, farmerName: item.farmerName, items: [] };
    }
    farmerMap[fid].items.push(item);
  }

  let grandSubtotal = 0;
  let grandDelivery = 0;
  let grandService  = 0;
  let grandTax      = 0;

  const groups = Object.values(farmerMap).map((group) => {
    const subtotal    = +group.items.reduce((s, i) => s + i.pricePerKg * i.quantity, 0).toFixed(2);
    const delivery    = calcDelivery(group.items, deliveryType);
    const serviceFee  = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);
    const tax         = +((subtotal + delivery + serviceFee) * TAX_RATE).toFixed(2);
    const total       = +(subtotal + delivery + serviceFee + tax).toFixed(2);

    grandSubtotal += subtotal;
    grandDelivery += delivery;
    grandService  += serviceFee;
    grandTax      += tax;

    return { ...group, subtotal, delivery, serviceFee, tax, total };
  });

  const grandTotal = +(grandSubtotal + grandDelivery + grandService + grandTax).toFixed(2);

  return {
    groups,
    summary: {
      subtotal:    +grandSubtotal.toFixed(2),
      deliveryCost:+grandDelivery.toFixed(2),
      serviceFee:  +grandService.toFixed(2),
      tax:         +grandTax.toFixed(2),
      grandTotal,
      itemCount:   cart.items.length,
    },
    deliveryType,
  };
};

/**
 * Create orders — splits cart into per-farmer sub-orders.
 * All share the same parentOrderId for payment linkage.
 * Returns { orders, parentOrderId, grandTotal }
 */
export const createOrdersFromCart = async (buyerId, { addressId, deliveryType, paymentMethod }) => {
  const [cart, address] = await Promise.all([
    Cart.findOne({ buyer: buyerId }),
    Address.findOne({ _id: addressId, buyer: buyerId }),
  ]);

  if (!cart || !cart.items.length) {
    throw Object.assign(new Error("Cart is empty"), { status: 400 });
  }
  if (!address) {
    throw Object.assign(new Error("Delivery address not found"), { status: 404 });
  }

  // Build parentOrderId — ties all sub-orders to one payment
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const parentOrderId = `PAY-${Date.now()}-${rand}`;

  const deliveryAddr = {
    fullName: address.fullName, phone: address.phone,
    street: address.street, city: address.city,
    state: address.state, postalCode: address.postalCode,
  };

  const estimatedDelivery = new Date(
    Date.now() + deliveryDays(deliveryType) * 24 * 60 * 60 * 1000
  );

  // Group by farmer
  const farmerMap = {};
  for (const item of cart.items) {
    const fid = item.farmerId.toString();
    if (!farmerMap[fid]) farmerMap[fid] = { farmerId: fid, items: [] };
    farmerMap[fid].items.push(item);
  }

  const orderDocs = [];
  let grandTotal = 0;

  for (const { farmerId, items } of Object.values(farmerMap)) {
    const subtotal   = +items.reduce((s, i) => s + i.pricePerKg * i.quantity, 0).toFixed(2);
    const delivery   = calcDelivery(items, deliveryType);
    const serviceFee = +(subtotal * PLATFORM_FEE_RATE).toFixed(2);
    const tax        = +((subtotal + delivery + serviceFee) * TAX_RATE).toFixed(2);
    const total      = +(subtotal + delivery + serviceFee + tax).toFixed(2);
    grandTotal      += total;

    orderDocs.push({
      buyer: buyerId, farmer: farmerId, parentOrderId,
      items: items.map((i) => ({
        crop: i.crop, cropName: i.cropName, cropImage: i.cropImage,
        quantity: i.quantity, unit: i.unit ?? "kg",
        pricePerKg: i.pricePerKg, subtotal: +(i.pricePerKg * i.quantity).toFixed(2),
      })),
      subtotal, deliveryCost: delivery, serviceFee, tax,
      totalAmount: total, deliveryType, deliveryAddress: deliveryAddr,
      estimatedDelivery, paymentMethod,
      paymentStatus: "pending_payment", orderStatus: "pending_payment",
    });
  }

  const orders = await Promise.all(orderDocs.map((doc) => new Order(doc).save()));

  // Notify each farmer in real-time that a new paid order arrived
  const io = getSocketServer();
  if (io) {
    for (const order of orders) {
      io.to(`user:${order.farmer.toString()}`).emit("new_order", {
        orderId: order._id,
        parentOrderId: order.parentOrderId,
        buyerId: order.buyer.toString(),
        totalAmount: order.totalAmount,
        message: "New order received — payment pending",
      });
    }
  }

  // ── Deduct stock from each CropListing atomically ──────────────────
  // Collect total ordered qty per listing across all cart items
  const stockDeductions = {};
  for (const item of cart.items) {
    const cid = item.crop?.toString() ?? item.cropId?.toString();
    if (!cid) continue;
    stockDeductions[cid] = (stockDeductions[cid] ?? 0) + item.quantity;
  }

  // Pre-flight stock check — reject if any listing has insufficient stock
  for (const [cropId, deductQty] of Object.entries(stockDeductions)) {
    const listing = await CropListing.findById(cropId).select("quantity cropName status").lean();
    if (!listing || listing.status === "sold" || listing.quantity < deductQty) {
      throw Object.assign(
        new Error(`"${listing?.cropName ?? "A crop"}" is out of stock or has insufficient quantity`),
        { status: 400 }
      );
    }
  }

  for (const [cropId, deductQty] of Object.entries(stockDeductions)) {
    // Step 1: decrement quantity (clamp at 0 via $max in a second pass)
    await CropListing.findByIdAndUpdate(cropId, { $inc: { quantity: -deductQty } });

    // Step 2: clamp to 0 and mark sold if quantity went negative
    const updated = await CropListing.findByIdAndUpdate(
      cropId,
      { $max: { quantity: 0 } },
      { new: true }
    ).lean();

    // Step 3: if now out of stock, flip status and isActive
    if (updated && updated.quantity <= 0) {
      await CropListing.findByIdAndUpdate(cropId, {
        $set: { status: "sold", isActive: false },
      });
      updated.status   = "sold";
      updated.isActive = false;
    }

    if (updated) {
      const outOfStock = updated.quantity <= 0;
      emitStockUpdate(cropId, updated.quantity, outOfStock);
      // Notify the farmer's inventory panel in real-time
      emitInventoryUpdate(updated.farmer?.toString() ?? updated.farmer, {
        cropId,
        cropName: updated.cropName,
        quantity: updated.quantity,
        status: updated.status,
        event: outOfStock ? "sold" : "stock_reduced",
      });
    }
  }
  // ───────────────────────────────────────────────────────────────────

  // Clear cart after order creation
  await Cart.findOneAndUpdate(
    { buyer: buyerId },
    { $set: { items: [], subtotal: 0, deliveryCost: 0, serviceFee: 0, tax: 0, grandTotal: 0 } }
  );
  await deleteCache(`cart_${buyerId}`);
  await deleteCache(`checkout_summary_${buyerId}`);

  return { orders, parentOrderId, grandTotal: +grandTotal.toFixed(2) };
};

/** Mark all sub-orders under a parentOrderId as paid */
export const markOrdersPaid = async (parentOrderId, paymentId) => {
  const orders = await Order.find({ parentOrderId }).select("buyer farmer totalAmount").lean();
  await Order.updateMany(
    { parentOrderId },
    { $set: { paymentStatus: "paid", orderStatus: "paid", paymentId } }
  );
  // Invalidate buyer orders cache for all affected buyers
  const buyerIds = [...new Set(orders.map((o) => o.buyer.toString()))];
  await Promise.all(buyerIds.map((id) => deleteCache(`buyer_orders_${id}`)));
  // Invalidate analytics cache + emit real-time update
  await Promise.all(buyerIds.map((id) => deleteCache(`analytics_buyer_${id}_30d_all`)));
  buyerIds.forEach((id) => emitAnalyticsUpdate(id, "order", { event: "payment_confirmed", parentOrderId }));
  // Emit order_update to buyer dashboard so recent orders refresh
  buyerIds.forEach((id) => emitOrderUpdate({ buyerId: id, order: { parentOrderId, orderStatus: "paid", paymentId } }));

  // Notify each farmer that payment is confirmed
  const io = getSocketServer();
  if (io) {
    for (const order of orders) {
      io.to(`user:${order.farmer.toString()}`).emit("order_paid", {
        orderId: order._id,
        parentOrderId,
        totalAmount: order.totalAmount,
        message: "Payment confirmed — order is now active",
      });
    }
  }
};

/** Get single order by orderId string */
export const getOrderById = async (orderId, buyerId) => {
  const order = await Order.findOne({ orderId, buyer: buyerId })
    .populate("farmer", "name email phone")
    .populate("items.crop", "cropName image");
  if (!order) throw Object.assign(new Error("Order not found"), { status: 404 });
  return order;
};

/** Get all orders for a buyer */
export const getBuyerOrders = async (buyerId) => {
  return Order.find({ buyer: buyerId })
    .sort({ createdAt: -1 })
    .populate("farmer", "name")
    .lean();
};
