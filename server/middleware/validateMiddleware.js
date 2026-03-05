import { body, validationResult } from "express-validator";

const normalizeRole = (value) =>
	typeof value === "string" ? value.trim().toLowerCase() : "farmer";

const normalizeText = (value) =>
	typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

const phonePattern = /^\+?[1-9]\d{9,14}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,64}$/;

const requestBuckets = new Map();

export const createRateLimiter = ({ windowMs, max, message }) => {
	return (req, res, next) => {
		const now = Date.now();
		const emailKey =
			typeof req.body?.email === "string"
				? req.body.email.trim().toLowerCase()
				: "anonymous";

		const key = `${req.ip}:${req.originalUrl}:${emailKey}`;
		const existingBucket = requestBuckets.get(key);

		const bucket =
			!existingBucket || now > existingBucket.expiresAt
				? { count: 1, expiresAt: now + windowMs }
				: { ...existingBucket, count: existingBucket.count + 1 };

		requestBuckets.set(key, bucket);

		if (requestBuckets.size > 5000) {
			for (const [bucketKey, value] of requestBuckets.entries()) {
				if (now > value.expiresAt) {
					requestBuckets.delete(bucketKey);
				}
			}
		}

		if (bucket.count > max) {
			const retryAfterSeconds = Math.max(
				1,
				Math.ceil((bucket.expiresAt - now) / 1000)
			);

			res.set("Retry-After", String(retryAfterSeconds));

			return res.status(429).json({
				message,
				retryAfterSeconds
			});
		}

		next();
	};
};

export const registerLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 30,
	message: "Too many registration attempts. Please try again later."
});

export const loginLimiter = createRateLimiter({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: "Too many login attempts. Please try again later."
});

export const registerValidation = [
	body("name")
		.customSanitizer(normalizeText)
		.notEmpty()
		.withMessage("Name is required")
		.isLength({ min: 2, max: 80 })
		.withMessage("Name must be between 2 and 80 characters"),

	body("email")
		.trim()
		.notEmpty()
		.withMessage("Email is required")
		.isEmail()
		.withMessage("Enter a valid email address")
		.normalizeEmail(),

	body("phone")
		.trim()
		.notEmpty()
		.withMessage("Phone number is required")
		.matches(phonePattern)
		.withMessage("Phone number must be in international format (10-15 digits)"),

	body("password")
		.notEmpty()
		.withMessage("Password is required")
		.matches(passwordPattern)
		.withMessage(
			"Password must be 8-64 chars and include uppercase, lowercase, number, and special character"
		),

	body("role")
		.optional({ values: "falsy" })
		.customSanitizer(normalizeRole)
		.isIn(["farmer", "buyer", "expert"])
		.withMessage("Role must be farmer, buyer, or expert"),

	body("state")
		.customSanitizer(normalizeText)
		.notEmpty()
		.withMessage("State is required")
		.isLength({ min: 2, max: 80 })
		.withMessage("State must be between 2 and 80 characters"),

	body("city")
		.customSanitizer(normalizeText)
		.notEmpty()
		.withMessage("City is required")
		.isLength({ min: 2, max: 80 })
		.withMessage("City must be between 2 and 80 characters"),

	body("farmSize")
		.optional({ values: "falsy" })
		.isFloat({ gt: 0, lt: 100000 })
		.withMessage("Farm size must be greater than 0 and less than 100000 acres")
		.toFloat(),

	body("crops")
		.optional({ values: "falsy" })
		.customSanitizer(normalizeText)
		.isLength({ min: 2, max: 200 })
		.withMessage("Crop details must be between 2 and 200 characters"),

	body("company")
		.optional({ values: "falsy" })
		.customSanitizer(normalizeText)
		.isLength({ min: 2, max: 120 })
		.withMessage("Company name must be between 2 and 120 characters"),

	body("license")
		.optional({ values: "falsy" })
		.customSanitizer(normalizeText)
		.isLength({ min: 4, max: 80 })
		.withMessage("License number must be between 4 and 80 characters"),

	body("qualification")
		.optional({ values: "falsy" })
		.customSanitizer(normalizeText)
		.isLength({ min: 2, max: 120 })
		.withMessage("Qualification must be between 2 and 120 characters"),

	body("experience")
		.optional({ values: "falsy" })
		.isInt({ min: 0, max: 60 })
		.withMessage("Experience must be between 0 and 60 years")
		.toInt(),

	body().custom((_, { req }) => {
		const role = normalizeRole(req.body.role || "farmer");
		req.body.role = role;

		if (role === "farmer") {
			if (!req.body.farmSize) {
				throw new Error("Farm size is required for farmer accounts");
			}
			if (!req.body.crops || String(req.body.crops).trim().length < 2) {
				throw new Error("Crop details are required for farmer accounts");
			}
		}

		if (role === "buyer") {
			if (!req.body.company || String(req.body.company).trim().length < 2) {
				throw new Error("Company name is required for buyer accounts");
			}
			if (!req.body.license || String(req.body.license).trim().length < 4) {
				throw new Error("License number is required for buyer accounts");
			}
		}

		if (role === "expert") {
			if (
				!req.body.qualification ||
				String(req.body.qualification).trim().length < 2
			) {
				throw new Error("Qualification is required for expert accounts");
			}
			if (req.body.experience === undefined || req.body.experience === null || req.body.experience === "") {
				throw new Error("Experience is required for expert accounts");
			}
		}

		return true;
	})
];

export const loginValidation = [
	body("email")
		.trim()
		.notEmpty()
		.withMessage("Email is required")
		.isEmail()
		.withMessage("Enter a valid email address")
		.normalizeEmail(),

	body("password")
		.isString()
		.withMessage("Password is required")
		.notEmpty()
		.withMessage("Password is required")
		.isLength({ min: 6, max: 128 })
		.withMessage("Password length must be between 6 and 128 characters")
];

export const validateRequest = (req, res, next) => {
	const errors = validationResult(req);

	if (errors.isEmpty()) {
		return next();
	}

	return res.status(422).json({
		message: "Validation failed",
		errors: errors.array().map((error) => ({
			field: error.path,
			message: error.msg
		}))
	});
};
