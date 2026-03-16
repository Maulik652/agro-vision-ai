import mongoose from "mongoose";

/** Drop stale indexes left over from old schema versions */
const runMigrations = async () => {
  try {
    const db = mongoose.connection.db;

    // Fix: old Cart schema used `buyerId` field — drop the stale unique index
    const cartIndexes = await db.collection("carts").indexes().catch(() => []);
    if (cartIndexes.find((i) => i.name === "buyerId_1")) {
      await db.collection("carts").dropIndex("buyerId_1");
      console.log("[Migration] Dropped stale carts.buyerId_1 index");
    }

    // Remove any null-buyer cart documents that block new inserts
    const { deletedCount } = await db.collection("carts").deleteMany({ buyer: null });
    if (deletedCount > 0) {
      console.log(`[Migration] Removed ${deletedCount} null-buyer cart document(s)`);
    }
  } catch (err) {
    console.warn("[Migration] Warning:", err.message);
  }
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");
    await runMigrations();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;