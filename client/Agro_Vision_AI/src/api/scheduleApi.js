import api from "./axios";

const unwrap = (r) => r?.data?.data;

// Events
export const fetchEvents        = (params = {}) => api.get("/schedule/events", { params }).then(unwrap);
export const createEvent        = (body)        => api.post("/schedule/events", body).then(unwrap);
export const updateEvent        = (id, body)    => api.patch(`/schedule/events/${id}`, body).then(unwrap);
export const deleteEvent        = (id)          => api.delete(`/schedule/events/${id}`).then(unwrap);

// Availability
export const fetchAvailability  = (expertId, date) => api.get(`/schedule/availability/${expertId}`, { params: { date } }).then(unwrap);

// Tasks
export const fetchTasks         = (params = {}) => api.get("/schedule/tasks", { params }).then(unwrap);
export const createTask         = (body)        => api.post("/schedule/tasks", body).then(unwrap);
export const updateTask         = (id, body)    => api.patch(`/schedule/tasks/${id}`, body).then(unwrap);

// Analytics
export const fetchScheduleAnalytics = () => api.get("/schedule/analytics").then(unwrap);

// AI Smart Schedule
export const smartSchedule      = (body) => api.post("/schedule/smart-schedule", body).then(unwrap);
