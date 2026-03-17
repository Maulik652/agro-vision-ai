import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const seedAdminUser = async () => {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn("[Admin Seed] ADMIN_EMAIL or ADMIN_PASSWORD not set in .env — skipping.");
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      // Ensure the role is admin even if the account already exists
      if (existing.role !== "admin") {
        await User.updateOne({ _id: existing._id }, { role: "admin" });
        console.log(`[Admin Seed] Upgraded existing user ${email} to admin role.`);
      } else {
        console.log(`[Admin Seed] Admin user already exists: ${email}`);
      }
      return;
    }

    const hashed = await bcrypt.hash(password, 12);

    await User.create({
      name: "Super Admin",
      email: email.toLowerCase(),
      phone: "0000000000",
      password: hashed,
      role: "admin",
      state: "Admin",
      city: "Admin",
    });

    console.log(`[Admin Seed] Admin user created → ${email}`);
  } catch (err) {
    console.error("[Admin Seed] Failed:", err.message);
  }
};
