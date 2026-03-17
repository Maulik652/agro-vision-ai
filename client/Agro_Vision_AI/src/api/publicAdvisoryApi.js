import api from "./axios.js";

const unwrap = (r) => r?.data?.data;

export const fetchPublicAdvisories = (params = {}) =>
  api.get("/advisories/public", { params }).then(unwrap);

export const fetchPublicAdvisoryById = (id) =>
  api.get(`/advisories/public/${id}`).then(unwrap);
