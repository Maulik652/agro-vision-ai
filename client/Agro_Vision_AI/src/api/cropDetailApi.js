import api from "./axios";

const unwrap = (res) => res.data?.data ?? res.data;

/**
 * Fetch full crop listing detail by ID.
 * GET /api/crops/:id
 */
export async function fetchCropDetail(cropId) {
  const res = await api.get(`/crops/${cropId}`);
  return unwrap(res);
}

/**
 * Fetch similar crop listings.
 * GET /api/crops/:id/similar
 */
export async function fetchSimilarCrops(cropId, { limit = 6 } = {}) {
  const res = await api.get(`/crops/${cropId}/similar`, { params: { limit } });
  return unwrap(res) ?? [];
}

/**
 * Fetch reviews for a crop listing.
 * GET /api/crops/:id/reviews
 */
export async function fetchCropReviews(cropId, { page = 1, limit = 10 } = {}) {
  const res = await api.get(`/crops/${cropId}/reviews`, { params: { page, limit } });
  return unwrap(res) ?? [];
}

/**
 * Submit or update a review for a crop listing.
 * POST /api/crops/:id/reviews
 * @param {string} cropId
 * @param {{ rating: number, comment: string }} body
 */
export async function submitCropReview(cropId, body) {
  const res = await api.post(`/crops/${cropId}/reviews`, body);
  return unwrap(res);
}

/**
 * Fetch farmer profile by farmer user ID.
 * GET /api/farmers/:id
 */
export async function fetchFarmerDetail(farmerId) {
  const res = await api.get(`/farmers/${farmerId}`);
  return unwrap(res);
}

/**
 * Fetch AI-powered crop insights for a listing.
 * GET /api/ai/crop-insights/:cropId
 */
export async function fetchAICropInsights(cropId) {
  const res = await api.get(`/ai/crop-insights/${cropId}`);
  return unwrap(res);
}

/**
 * Add a crop listing to the buyer's cart.
 * POST /api/cart/add
 * @param {{ cropId: string, quantity: number }} body
 */
export async function addCropToCart(body) {
  const res = await api.post(`/cart/add`, body);
  return unwrap(res);
}
