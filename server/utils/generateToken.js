import jwt from "jsonwebtoken";

const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: process.env.JWT_ISSUER || "agrovision-api",
      audience: process.env.JWT_AUDIENCE || "agrovision-client"
    }
  );
};

export default generateToken;