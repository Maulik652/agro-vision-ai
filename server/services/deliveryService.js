/**
 * Delivery Estimator Service
 * Calculates delivery cost based on buyer location, farmer locations,
 * and total weight. Uses a tiered distance-based model.
 */

// State-to-zone mapping for India (simplified)
const STATE_ZONE = {
  "maharashtra": "west", "gujarat": "west", "rajasthan": "west", "goa": "west",
  "delhi": "north", "haryana": "north", "punjab": "north", "himachal pradesh": "north",
  "uttar pradesh": "north", "uttarakhand": "north", "jammu and kashmir": "north",
  "tamil nadu": "south", "kerala": "south", "karnataka": "south", "andhra pradesh": "south",
  "telangana": "south", "puducherry": "south",
  "west bengal": "east", "odisha": "east", "bihar": "east", "jharkhand": "east",
  "assam": "east", "meghalaya": "east", "manipur": "east", "nagaland": "east",
  "madhya pradesh": "central", "chhattisgarh": "central",
};

const ZONE_DISTANCE_KM = {
  same: 100,
  adjacent: 400,
  cross: 900,
  remote: 1500,
};

const RATE_PER_KM_PER_KG = 0.05; // ₹ per km per kg
const BASE_CHARGE = 50;           // ₹ base per shipment
const MIN_DELIVERY = 30;          // ₹ minimum
const MAX_DELIVERY = 2000;        // ₹ cap per shipment

/**
 * Estimate distance category between two states
 */
const getDistanceKm = (buyerState, farmerState) => {
  if (!buyerState || !farmerState) return ZONE_DISTANCE_KM.cross;

  const bZone = STATE_ZONE[buyerState.toLowerCase()] ?? "central";
  const fZone = STATE_ZONE[farmerState.toLowerCase()] ?? "central";

  if (bZone === fZone) return ZONE_DISTANCE_KM.same;

  const adjacent = {
    north:   ["west", "central", "east"],
    west:    ["north", "central", "south"],
    south:   ["west", "central", "east"],
    east:    ["north", "central", "south"],
    central: ["north", "west", "south", "east"],
  };

  if (adjacent[bZone]?.includes(fZone)) return ZONE_DISTANCE_KM.adjacent;
  return ZONE_DISTANCE_KM.cross;
};

/**
 * Calculate delivery cost for a single farmer shipment
 * @param {number} weightKg
 * @param {string} buyerState
 * @param {string} farmerState
 * @returns {{ cost: number, distanceKm: number, zone: string }}
 */
export const estimateShipmentCost = (weightKg, buyerState, farmerState) => {
  const distanceKm = getDistanceKm(buyerState, farmerState);
  const rawCost = BASE_CHARGE + distanceKm * RATE_PER_KM_PER_KG * Math.max(1, weightKg);
  const cost = Math.min(MAX_DELIVERY, Math.max(MIN_DELIVERY, Math.round(rawCost)));

  const bZone = STATE_ZONE[buyerState?.toLowerCase()] ?? "central";
  const fZone = STATE_ZONE[farmerState?.toLowerCase()] ?? "central";
  const zone  = bZone === fZone ? "local" : "inter-state";

  return { cost, distanceKm, zone };
};

/**
 * Calculate total delivery cost for a multi-farmer cart
 * @param {Array} items - cart items with farmerId, quantity, farmerState
 * @param {string} buyerState
 * @returns {{ totalDeliveryCost: number, breakdown: Array }}
 */
export const estimateCartDelivery = (items, buyerState) => {
  if (!items?.length) return { totalDeliveryCost: 0, breakdown: [] };

  // Group by farmer
  const farmerGroups = {};
  for (const item of items) {
    const fid = item.farmerId?.toString();
    if (!farmerGroups[fid]) {
      farmerGroups[fid] = {
        farmerId:    fid,
        farmerName:  item.farmerName,
        farmerState: item.farmerState ?? "",
        totalWeight: 0,
      };
    }
    farmerGroups[fid].totalWeight += item.quantity;
  }

  const breakdown = [];
  let totalDeliveryCost = 0;

  for (const group of Object.values(farmerGroups)) {
    const { cost, distanceKm, zone } = estimateShipmentCost(
      group.totalWeight,
      buyerState,
      group.farmerState
    );
    breakdown.push({
      farmerId:    group.farmerId,
      farmerName:  group.farmerName,
      weightKg:    group.totalWeight,
      distanceKm,
      zone,
      cost,
    });
    totalDeliveryCost += cost;
  }

  return { totalDeliveryCost, breakdown };
};
