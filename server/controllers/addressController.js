import * as svc from "../services/addressService.js";

const err = (res, e) => res.status(e.status ?? 500).json({ success: false, message: e.message });

export const listAddresses = async (req, res) => {
  try {
    const data = await svc.getAddresses(req.user._id.toString());
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

export const addAddress = async (req, res) => {
  try {
    const data = await svc.createAddress(req.user._id.toString(), req.validatedBody);
    res.status(201).json({ success: true, data });
  } catch (e) { err(res, e); }
};

export const editAddress = async (req, res) => {
  try {
    const data = await svc.updateAddress(req.user._id.toString(), req.validatedParams.id, req.validatedBody);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};

export const removeAddress = async (req, res) => {
  try {
    const data = await svc.deleteAddress(req.user._id.toString(), req.validatedParams.id);
    res.json({ success: true, data });
  } catch (e) { err(res, e); }
};
