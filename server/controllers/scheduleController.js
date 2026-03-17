import ScheduleEvent from "../models/ScheduleEvent.js";
import ScheduleTask  from "../models/ScheduleTask.js";

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data });
const err = (res, e, status = 500)    => res.status(e.status || status).json({ success: false, message: e.message || "Server error" });

/* ─── EVENTS ─────────────────────────────────────────────────────────────── */

export const getEvents = async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const filter = {
      $or: [
        { createdBy: req.user._id },
        { participants: req.user._id },
      ],
    };
    if (from || to) {
      filter.startTime = {};
      if (from) filter.startTime.$gte = new Date(from);
      if (to)   filter.startTime.$lte = new Date(to);
    }
    if (type) filter.type = type;

    const events = await ScheduleEvent.find(filter)
      .populate("participants", "name role")
      .populate("createdBy", "name role")
      .sort({ startTime: 1 })
      .lean();

    ok(res, events);
  } catch (e) { err(res, e); }
};

export const createEvent = async (req, res) => {
  try {
    const { title, description, type, participants, startTime, endTime, priority, reminder, color, consultationId } = req.body;
    if (!title || !startTime || !endTime) return err(res, { message: "title, startTime, endTime required" }, 400);
    if (new Date(endTime) <= new Date(startTime)) return err(res, { message: "endTime must be after startTime" }, 400);

    const event = await ScheduleEvent.create({
      title, description, type, participants, startTime, endTime,
      priority, reminder, color, consultationId,
      createdBy: req.user._id,
    });

    ok(res, event, 201);
  } catch (e) { err(res, e); }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await ScheduleEvent.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!event) return err(res, { message: "Event not found" }, 404);

    const allowed = ["title","description","type","participants","startTime","endTime","status","priority","reminder","color"];
    allowed.forEach(k => { if (req.body[k] !== undefined) event[k] = req.body[k]; });
    await event.save();
    ok(res, event);
  } catch (e) { err(res, e); }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await ScheduleEvent.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!event) return err(res, { message: "Event not found" }, 404);
    ok(res, { deleted: true });
  } catch (e) { err(res, e); }
};

/* ─── AVAILABILITY ───────────────────────────────────────────────────────── */

export const getAvailability = async (req, res) => {
  try {
    const { expertId } = req.params;
    const { date } = req.query;
    const day = date ? new Date(date) : new Date();
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);

    const booked = await ScheduleEvent.find({
      $or: [{ createdBy: expertId }, { participants: expertId }],
      startTime: { $gte: start, $lte: end },
      status: { $in: ["scheduled", "ongoing"] },
    }).select("startTime endTime").lean();

    // Generate 9am–6pm slots in 30-min increments
    const slots = [];
    for (let h = 9; h < 18; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);

        const busy = booked.some(b =>
          new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart
        );
        slots.push({
          time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
          available: !busy,
        });
      }
    }
    ok(res, { date: day.toISOString().split("T")[0], slots });
  } catch (e) { err(res, e); }
};

/* ─── TASKS ──────────────────────────────────────────────────────────────── */

export const getTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = { assignedTo: req.user._id };
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;

    const tasks = await ScheduleTask.find(filter)
      .populate("createdBy", "name role")
      .sort({ deadline: 1 })
      .lean();
    ok(res, tasks);
  } catch (e) { err(res, e); }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, deadline, priority, taskType, eventId } = req.body;
    if (!title) return err(res, { message: "title required" }, 400);

    const task = await ScheduleTask.create({
      title, description, deadline, priority, taskType, eventId,
      assignedTo: req.user._id,
      createdBy:  req.user._id,
    });
    ok(res, task, 201);
  } catch (e) { err(res, e); }
};

export const updateTask = async (req, res) => {
  try {
    const task = await ScheduleTask.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!task) return err(res, { message: "Task not found" }, 404);

    const allowed = ["title","description","deadline","priority","status","taskType"];
    allowed.forEach(k => { if (req.body[k] !== undefined) task[k] = req.body[k]; });
    if (req.body.status === "completed") task.completedAt = new Date();
    await task.save();
    ok(res, task);
  } catch (e) { err(res, e); }
};

/* ─── ANALYTICS ──────────────────────────────────────────────────────────── */

export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const [totalEvents, completedEvents, cancelledEvents, totalTasks, completedTasks] = await Promise.all([
      ScheduleEvent.countDocuments({ createdBy: userId }),
      ScheduleEvent.countDocuments({ createdBy: userId, status: "completed" }),
      ScheduleEvent.countDocuments({ createdBy: userId, status: "cancelled" }),
      ScheduleTask.countDocuments({ assignedTo: userId }),
      ScheduleTask.countDocuments({ assignedTo: userId, status: "completed" }),
    ]);

    const now = new Date();
    const missedAppointments = await ScheduleEvent.countDocuments({
      createdBy: userId,
      endTime: { $lt: now },
      status: "scheduled",
    });

    const productivityScore = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    ok(res, {
      totalEvents, completedEvents, cancelledEvents,
      totalTasks, completedTasks, missedAppointments, productivityScore,
    });
  } catch (e) { err(res, e); }
};

/* ─── AI SMART SCHEDULE ──────────────────────────────────────────────────── */

export const smartSchedule = async (req, res) => {
  try {
    const { duration = 30, preferredDate, priority = "medium" } = req.body;
    const userId = req.user._id;

    const day = preferredDate ? new Date(preferredDate) : new Date();
    day.setDate(day.getDate() + (preferredDate ? 0 : 1)); // default tomorrow

    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end   = new Date(day); end.setHours(23, 59, 59, 999);

    const existing = await ScheduleEvent.find({
      $or: [{ createdBy: userId }, { participants: userId }],
      startTime: { $gte: start, $lte: end },
      status: { $in: ["scheduled", "ongoing"] },
    }).select("startTime endTime").lean();

    // Find first free slot 9am–5pm
    let suggestion = null;
    for (let h = 9; h < 17; h++) {
      for (let m = 0; m < 60; m += 30) {
        const slotStart = new Date(day); slotStart.setHours(h, m, 0, 0);
        const slotEnd   = new Date(slotStart); slotEnd.setMinutes(slotEnd.getMinutes() + duration);
        const conflict  = existing.some(e => new Date(e.startTime) < slotEnd && new Date(e.endTime) > slotStart);
        if (!conflict) { suggestion = { startTime: slotStart, endTime: slotEnd }; break; }
      }
      if (suggestion) break;
    }

    const conflictCount = existing.length;
    const label = suggestion
      ? `Best slot: ${suggestion.startTime.toLocaleString("en-IN", { weekday:"short", hour:"2-digit", minute:"2-digit" })} (${conflictCount} existing events)`
      : "No free slots found for that day — try another date";

    ok(res, { suggestion, conflictCount, label, priority });
  } catch (e) { err(res, e); }
};
