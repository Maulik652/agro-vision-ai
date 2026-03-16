import Address from "../models/Address.js";

export const getAddresses = (buyerId) =>
  Address.find({ buyer: buyerId }).sort({ isDefault: -1, createdAt: -1 }).lean();

export const createAddress = async (buyerId, data) => {
  // If new address is default, unset all others
  if (data.isDefault) {
    await Address.updateMany({ buyer: buyerId }, { $set: { isDefault: false } });
  }
  // If this is the first address, make it default automatically
  const count = await Address.countDocuments({ buyer: buyerId });
  if (count === 0) data.isDefault = true;

  return Address.create({ buyer: buyerId, ...data });
};

export const updateAddress = async (buyerId, id, data) => {
  if (data.isDefault) {
    await Address.updateMany({ buyer: buyerId }, { $set: { isDefault: false } });
  }
  const addr = await Address.findOneAndUpdate(
    { _id: id, buyer: buyerId },
    { $set: data },
    { new: true }
  );
  if (!addr) throw Object.assign(new Error("Address not found"), { status: 404 });
  return addr;
};

export const deleteAddress = async (buyerId, id) => {
  const addr = await Address.findOneAndDelete({ _id: id, buyer: buyerId });
  if (!addr) throw Object.assign(new Error("Address not found"), { status: 404 });
  // If deleted address was default, promote the next one
  if (addr.isDefault) {
    const next = await Address.findOne({ buyer: buyerId }).sort({ createdAt: -1 });
    if (next) { next.isDefault = true; await next.save(); }
  }
  return { deleted: true };
};
