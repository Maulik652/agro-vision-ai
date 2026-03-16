import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validateBody, validateParams } from "../middleware/zodValidate.js";
import { createAddressSchema, updateAddressSchema, addressIdSchema } from "../validation/checkoutValidation.js";
import { listAddresses, addAddress, editAddress, removeAddress } from "../controllers/addressController.js";

const router = express.Router();
router.use(protect);
router.use(authorize("buyer", "admin"));

router.get("/",        listAddresses);
router.post("/",       validateBody(createAddressSchema),  addAddress);
router.put("/:id",     validateParams(addressIdSchema), validateBody(updateAddressSchema), editAddress);
router.delete("/:id",  validateParams(addressIdSchema), removeAddress);

export default router;
