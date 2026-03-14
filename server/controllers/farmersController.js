import mongoose from "mongoose";
import User from "../models/User.js";
import MarketplaceFarmer from "../models/MarketplaceFarmer.js";
import CropReview from "../models/CropReview.js";
import Order from "../models/Order.js";
import CropListing from "../models/CropListing.js";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getFarmerById = async (req, res) => {
  try {
    const farmerId = req.validatedParams?.id || req.params.id;

    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid farmer id"
      });
    }

    const objectId = new mongoose.Types.ObjectId(farmerId);

    const [user, marketplaceFarmer, ratingStats, salesStats, listingCount] = await Promise.all([
      User.findById(objectId)
        .select("name city state certifications")
        .lean(),
      MarketplaceFarmer.findOne({ $or: [{ userId: objectId }, { _id: objectId }] }).lean(),
      CropReview.aggregate([
        { $match: { farmerId: objectId } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: { farmer: objectId } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" }
          }
        }
      ]),
      CropListing.countDocuments({ farmer: objectId, isActive: true, status: "active" })
    ]);

    if (!user && !marketplaceFarmer) {
      return res.status(404).json({
        success: false,
        message: "Farmer not found"
      });
    }

    const response = {
      success: true,
      farmer: {
        id: String(user?._id || marketplaceFarmer?.userId || marketplaceFarmer?._id),
        name: user?.name || marketplaceFarmer?.name || "Farmer",
        farmLocation:
          marketplaceFarmer?.farmLocation
          || [user?.city || "", user?.state || ""].filter(Boolean).join(", "),
        rating: Number(
          toNumber(
            marketplaceFarmer?.rating,
            ratingStats[0]?.avgRating != null ? Number(ratingStats[0].avgRating.toFixed(1)) : 4.4
          ).toFixed(1)
        ),
        totalSales: Number(
          toNumber(marketplaceFarmer?.totalSales, salesStats[0]?.totalSales || 0).toFixed(2)
        ),
        certifications:
          marketplaceFarmer?.certifications?.length
            ? marketplaceFarmer.certifications
            : Array.isArray(user?.certifications)
              ? user.certifications
              : [],
        totalReviews: toNumber(ratingStats[0]?.totalReviews, 0),
        activeListings: listingCount
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer profile",
      detail: error.message
    });
  }
};
