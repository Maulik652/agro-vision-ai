import jwt from "jsonwebtoken";
import User from "../models/User.js";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "av_access_token";

const verifyOptions = {
  issuer: process.env.JWT_ISSUER || "agrovision-api",
  audience: process.env.JWT_AUDIENCE || "agrovision-client"
};

const extractToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  if (req.cookies?.[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }

  return null;
};

export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, verifyOptions);

    req.user = await User.findById(decoded.id).select(
      "-password -failedLoginAttempts -lockUntil"
    );

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Hard-deleted users — force logout
    if (req.user.isDeleted) {
      return res.status(403).json({
        code: "ACCOUNT_DELETED",
        message: "Your account has been removed. Please contact admin."
      });
    }

    // Blocked users — force logout
    if (req.user.status === "blocked") {
      return res.status(403).json({
        code: "ACCOUNT_BLOCKED",
        message: "Your account has been blocked by admin. Please contact support."
      });
    }

    // Suspended users — force logout
    if (req.user.status === "suspended") {
      return res.status(403).json({
        code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended. Please contact admin."
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedRoles = roles.map((role) => role.toLowerCase());

    if (!req.user || !normalizedRoles.includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    next();
  };
};