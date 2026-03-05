import express from "express";
import {
	registerUser,
	loginUser,
	logoutUser,
	getCurrentUser
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
	loginLimiter,
	loginValidation,
	registerLimiter,
	registerValidation,
	validateRequest
} from "../middleware/validateMiddleware.js";

const router = express.Router();

/*
 @route   POST /api/auth/register
 @desc    Register new user
 @access  Public
*/
router.post(
	"/register",
	registerLimiter,
	registerValidation,
	validateRequest,
	registerUser
);

/*
 @route   POST /api/auth/login
 @desc    Login user
 @access  Public
*/
router.post(
	"/login",
	loginLimiter,
	loginValidation,
	validateRequest,
	loginUser
);

router.post("/logout", logoutUser);
router.get("/me", protect, getCurrentUser);

export default router;