import User from "../models/User.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "av_access_token";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_LOCK_MINUTES = 15;
const MAX_FAILED_LOGINS = 5;

const normalizeRole = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "farmer";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? undefined : parsed;
};

const cookieSecurity = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  secure: cookieSecurity,
  sameSite: cookieSecurity ? "none" : "lax",
  maxAge: COOKIE_MAX_AGE_MS,
  path: "/"
};

const clearCookieOptions = {
  httpOnly: true,
  secure: cookieSecurity,
  sameSite: cookieSecurity ? "none" : "lax",
  path: "/"
};

const mapUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  state: user.state,
  city: user.city,
  farmSize: user.farmSize,
  crops: user.crops,
  company: user.company,
  license: user.license,
  qualification: user.qualification,
  experience: user.experience,
  lastLoginAt: user.lastLoginAt
});

/* REGISTER */
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      state,
      city,
      farmSize,
      crops,
      company,
      license,
      qualification,
      experience
    } = req.body;

    const normalizedRole = normalizeRole(role || "farmer");
    const allowedRoles = ["farmer", "buyer", "expert"];

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: normalizeText(name),
      email: normalizedEmail,
      phone: normalizeText(phone),
      password: hashedPassword,
      role: normalizedRole,
      state: normalizeText(state),
      city: normalizeText(city),
      farmSize: toOptionalNumber(farmSize),
      crops: normalizeText(crops),
      company: normalizeText(company),
      license: normalizeText(license),
      qualification: normalizeText(qualification),
      experience: toOptionalNumber(experience)
    });

    const token = generateToken(user._id.toString(), user.role);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: mapUser(user)
    });
  }
  catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  }
};

/* LOGIN */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +failedLoginAttempts +lockUntil"
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const now = Date.now();

    if (user.lockUntil && user.lockUntil.getTime() > now) {
      const remainingMinutes = Math.ceil(
        (user.lockUntil.getTime() - now) / (60 * 1000)
      );

      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: failedAttempts, lockUntil: null };

      if (failedAttempts >= MAX_FAILED_LOGINS) {
        updates.failedLoginAttempts = 0;
        updates.lockUntil = new Date(
          now + LOGIN_LOCK_MINUTES * 60 * 1000
        );
      }

      await User.updateOne({ _id: user._id }, { $set: updates });

      if (failedAttempts >= MAX_FAILED_LOGINS) {
        return res.status(423).json({
          message: `Too many failed login attempts. Account locked for ${LOGIN_LOCK_MINUTES} minutes.`
        });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id.toString(), user.role);
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: mapUser(user)
    });
  }
  catch (error) {
    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }

};

export const logoutUser = async (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, clearCookieOptions);

  return res.status(200).json({
    message: "Logged out successfully"
  });
};

export const getCurrentUser = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }

  return res.status(200).json({
    user: mapUser(req.user)
  });


};