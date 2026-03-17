import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getEvents, createEvent, updateEvent, deleteEvent,
  getAvailability,
  getTasks, createTask, updateTask,
  getAnalytics,
  smartSchedule,
} from "../controllers/scheduleController.js";

const router = express.Router();

router.use(protect);

// Events
router.get("/events",              getEvents);
router.post("/events",             createEvent);
router.patch("/events/:id",        updateEvent);
router.delete("/events/:id",       deleteEvent);

// Availability
router.get("/availability/:expertId", getAvailability);

// Tasks
router.get("/tasks",               getTasks);
router.post("/tasks",              createTask);
router.patch("/tasks/:id",         updateTask);

// Analytics
router.get("/analytics",           getAnalytics);

// AI Smart Schedule
router.post("/smart-schedule",     smartSchedule);

export default router;
