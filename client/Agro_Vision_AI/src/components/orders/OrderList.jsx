/**
 * OrderList — renders filtered list of OrderCards
 */
import OrderCard from "./OrderCard.jsx";
import EmptyOrders from "./EmptyOrders.jsx";

export default function OrderList({ orders }) {
  if (!orders?.length) return <EmptyOrders />;

  return (
    <div className="space-y-4">
      {orders.map((order, i) => (
        <OrderCard key={order._id ?? order.orderId} order={order} index={i} />
      ))}
    </div>
  );
}
