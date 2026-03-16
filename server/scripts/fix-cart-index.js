/**
 * Run once: drops stale buyerId_1 index and removes null-buyer cart docs.
 * Usage: node scripts/fix-cart-index.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

await mongoose.connect(MONGO_URI);
console.log("Connected to MongoDB");

const db = mongoose.connection.db;
const col = db.collection("carts");

// List current indexes
const indexes = await col.indexes();
console.log("Current indexes:", indexes.map((i) => i.name));

// Drop stale buyerId_1 if it exists
if (indexes.find((i) => i.name === "buyerId_1")) {
  await col.dropIndex("buyerId_1");
  console.log("✅ Dropped buyerId_1 index");
} else {
  console.log("ℹ️  buyerId_1 index not found — nothing to drop");
}

// Remove any documents where buyer is null (orphaned docs)
const { deletedCount } = await col.deleteMany({ buyer: null });
console.log(`✅ Removed ${deletedCount} null-buyer cart document(s)`);

await mongoose.disconnect();
console.log("Done.");
process.exit(0);
