import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import GovernmentScheme from "../models/GovernmentScheme.js";

const router = Router();

/* ─── Seed schemes if empty ─── */
const SEED_SCHEMES = [
  {
    name: "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
    shortName: "PM-KISAN",
    description: "Direct income support of ₹6,000 per year to farmer families, paid in 3 equal installments of ₹2,000 each. All land-holding farmer families are eligible regardless of farm size.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "subsidy",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "₹6,000/year (₹2,000 × 3 installments) directly to bank account via DBT",
    applicationUrl: "https://pmkisan.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Bank Account Details"],
    amount: { min: 6000, max: 6000, unit: "INR/year" },
    status: "active"
  },
  {
    name: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
    shortName: "PMFBY",
    description: "Comprehensive crop insurance scheme with lowest premium rates — 2% for Kharif, 1.5% for Rabi, and 5% for commercial/horticultural crops. Covers yield losses due to natural calamities, pests, and diseases.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "insurance",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "Full insured sum on crop failure. Premium: 2% Kharif, 1.5% Rabi. Remaining premium paid by government.",
    applicationUrl: "https://pmfby.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Bank Account", "Sowing Certificate"],
    amount: { min: 0, max: 200000, unit: "INR (insured sum varies)" },
    status: "active"
  },
  {
    name: "Kisan Credit Card (KCC)",
    shortName: "KCC",
    description: "Provides affordable credit to farmers for crop production, post-harvest expenses, and maintenance of farm assets. Interest rate of 4% p.a. (with interest subvention) for loans up to ₹3 lakh.",
    ministry: "Ministry of Finance / NABARD",
    category: "loan",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "Loan up to ₹3 lakh at 4% interest rate. Includes crop loan + term loan for allied activities.",
    applicationUrl: "https://www.nabard.org",
    documents: ["Aadhaar Card", "PAN Card", "Land Records", "Passport Photo", "Bank Statement"],
    amount: { min: 10000, max: 300000, unit: "INR" },
    status: "active"
  },
  {
    name: "PM Krishi Sinchayee Yojana (PMKSY) — Per Drop More Crop",
    shortName: "PMKSY",
    description: "Subsidy on micro-irrigation (drip & sprinkler) systems. Small/marginal farmers get 55% subsidy, other farmers get 45% subsidy on system cost.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "irrigation",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "55% subsidy for small/marginal farmers, 45% for others on drip & sprinkler irrigation systems.",
    applicationUrl: "https://pmksy.gov.in",
    documents: ["Aadhaar Card", "Land Records", "Bank Account", "Caste Certificate (if applicable)"],
    amount: { min: 5000, max: 100000, unit: "INR subsidy" },
    status: "active"
  },
  {
    name: "Soil Health Card Scheme",
    shortName: "SHC",
    description: "Free soil testing and health card for farmers. The card provides crop-wise nutrient recommendations based on actual soil test results. Issued every 2 years.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "other",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "Free soil testing with crop-specific fertilizer recommendations. Helps optimize input costs.",
    applicationUrl: "https://soilhealth.dac.gov.in",
    documents: ["Aadhaar Card", "Land Records"],
    amount: { min: 0, max: 0, unit: "INR (Free service)" },
    status: "active"
  },
  {
    name: "Paramparagat Krishi Vikas Yojana (PKVY)",
    shortName: "PKVY",
    description: "Promotes organic farming through cluster-based approach. ₹50,000/hectare for 3 years to farmer groups adopting organic farming. Covers inputs, certification, and marketing.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "organic",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["organic", "transitioning"] },
    benefits: "₹50,000/hectare over 3 years. Covers organic inputs (₹31,000), value addition (₹8,800), certification (₹500), marketing.",
    documents: ["Aadhaar Card", "Land Records", "Cluster Registration"],
    amount: { min: 50000, max: 50000, unit: "INR/hectare (3 years)" },
    status: "active"
  },
  {
    name: "Agriculture Infrastructure Fund (AIF)",
    shortName: "AIF",
    description: "₹1 lakh crore financing facility for post-harvest management infrastructure. 3% interest subvention on loans up to ₹2 crore for cold storage, warehouses, sorting/grading units.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "infrastructure",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["individual", "FPO", "cooperative"] },
    benefits: "3% interest subvention on loans up to ₹2 crore. CGFMU guarantee up to ₹2 crore.",
    applicationUrl: "https://agriinfra.dac.gov.in",
    documents: ["Project Report", "Land Ownership/Lease", "Bank Account", "PAN Card"],
    amount: { min: 100000, max: 20000000, unit: "INR loan" },
    status: "active"
  },
  {
    name: "e-NAM (National Agriculture Market)",
    shortName: "e-NAM",
    description: "Online trading platform for agricultural commodities. Farmers can sell directly to buyers across India, ensuring transparent price discovery and competitive bidding.",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    category: "market",
    eligibility: { states: [], minFarmSize: 0, maxFarmSize: 100000, crops: [], farmerTypes: ["all"] },
    benefits: "Transparent pricing, competitive bidding, wider market access, online payment. No registration fee.",
    applicationUrl: "https://enam.gov.in",
    documents: ["Aadhaar Card", "Bank Account", "Mobile Number"],
    amount: { min: 0, max: 0, unit: "INR (Free platform)" },
    status: "active"
  }
];

const seedSchemes = async () => {
  try {
    const count = await GovernmentScheme.countDocuments();
    if (count === 0) {
      await GovernmentScheme.insertMany(SEED_SCHEMES);
    }
  } catch {
    /* ignore seed errors */
  }
};
seedSchemes();

/* ─── GET /schemes ─── */
router.get("/", protect, async (req, res) => {
  try {
    const { category, state, status = "active", search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (state) filter["eligibility.states"] = { $in: [state, []] };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { shortName: new RegExp(search, "i") },
        { description: new RegExp(search, "i") }
      ];
    }

    const schemes = await GovernmentScheme.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, schemes });
  } catch (err) {
    console.error("Schemes fetch error:", err);
    return res.status(500).json({ message: "Failed to fetch schemes" });
  }
});

/* ─── GET /schemes/:id ─── */
router.get("/:id", protect, async (req, res) => {
  try {
    const scheme = await GovernmentScheme.findById(req.params.id).lean();
    if (!scheme) return res.status(404).json({ message: "Scheme not found" });
    return res.json({ success: true, scheme });
  } catch (err) {
    console.error("Scheme detail error:", err);
    return res.status(500).json({ message: "Failed to fetch scheme" });
  }
});

export default router;
