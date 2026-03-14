import api from "./axios";

export const fetchCropDetail = async (cropId) => {
	const response = await api.get(`/crops/${cropId}`);
	return response.data;
};

export const fetchCropReviews = async (cropId, params = {}) => {
	const response = await api.get(`/crops/${cropId}/reviews`, { params });
	return response.data;
};

export const submitCropReview = async (cropId, payload) => {
	const response = await api.post(`/crops/${cropId}/reviews`, payload);
	return response.data;
};

export const fetchSimilarCrops = async (cropId, params = {}) => {
	const response = await api.get(`/crops/${cropId}/similar`, { params });
	return response.data;
};

export const fetchFarmerDetail = async (farmerId) => {
	const response = await api.get(`/farmers/${farmerId}`);
	return response.data;
};

export const addCropToCart = async (payload) => {
	const response = await api.post("/cart/add", payload);
	return response.data;
};

export const fetchAICropInsights = async (cropId) => {
	const response = await api.get(`/ai/crop-insights/${cropId}`);
	return response.data;
};
