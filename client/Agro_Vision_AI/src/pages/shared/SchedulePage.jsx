/**
 * SchedulePage — AgroVision AI
 * Shared across: farmer, buyer, expert
 * Sections: Calendar · Events list · Tasks · AI Scheduler · Analytics · Event detail
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Plus, List, LayoutGrid, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import {
  fetchEvents, createEvent, updateEvent, deleteEvent,
  fetchTasks,
} from "../../api/scheduleApi";

import CalendarView      from "../../components/schedule/CalendarView";
import EventModal        from "../../components/schedule/EventModal";
import TaskList          from "../../components/schedule/TaskList";
import AIScheduler       from "../../components/schedule/AIScheduler";
import ScheduleAnalytics from "../../components/schedule/ScheduleAnalytics";
import EventDetailsPanel from "../../components/schedule/EventDetailsPanel";

const TYPE_COLOR = {
  consultation: "border-l-violet-400 bg-violet-50",
  task:         "border-l-amber-400 bg-amber-50",
  reminder:     "border-l-sky-400 bg-sky-50",
  meeting:      "border-l-emerald-400 bg-emerald-50",
  booking:      "border-l-rose-400 bg-rose-50",
};

const STATUS_DOT = {
  scheduled: "bg-blue-400",
  ongoing:   "bg-amber-400",
  completed: "bg-emerald-400",
  cancelled: "bg-red-400",
};

export default function SchedulePage() {
  const qc = useQueryClient();
  const [view,          setView]          = useState("calendar"); // calendar | list
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editEvent,     setEditEvent]     = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType,    setFilterType]    = useState("all");

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: events = [], isLoading: evLoading, refetch } = useQuery({
    queryKey: ["schedule-events"],
    queryFn: () => fetchEvents(),
    staleTime: 60_000,
  });

  const { data: tasks = [], isLoading: taskLoading } = useQuery({
    queryKey: ["schedule-tasks"],
    queryFn: () => fetchTasks(),
    staleTime: 60_000,
  });

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const createMut = useMutation({
    mutationFn: createEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule-events"] }); setModalOpen(false); toast.success("Event created"); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to create event"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateEvent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule-events"] }); setModalOpen(false); setEditEvent(null); toast.success("Event updated"); },
    onError: (e) => toast.error(e?.response?.data?.message || "Failed to update event"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule-events"] }); setModalOpen(false); setEditEvent(null); setSelectedEvent(null); toast.success("Event deleted"); },
    onError: () => toast.error("Failed to delete event"),
  });

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleSave = (form) => {
    if (editEvent?._id) updateMut.mutate({ id: editEvent._id, body: form });
    else createMut.mutate(form);
  };

  const openEdit = (ev) => { setEditEvent(ev); setModalOpen(true); };
  const openNew  = (prefill = {}) => { setEditEvent(prefill._id ? null : prefill); setModalOpen(true); };

  const handleAISlot = (slot) => {
    setEditEvent({ startTime: slot.startTime.toISOString().slice(0,16), endTime: slot.endTime.toISOString().slice(0,16) });
    setModalOpen(true);
  };

  /* ── Filtered events ──────────────────────────────────────────────────── */
  const filtered = useMemo(() =>
    filterType === "all" ? events : events.filter(e => e.type === filterType),
    [events, filterType]
  );

  // Upcoming (next 7 days)
  const now = new Date();
  const upcoming = events.filter(e => {
    const d = new Date(e.startTime);
    return d >= now && d <= new Date(now.getTime() + 7 * 86400000) && e.status === "scheduled";
  }).sort((a,b) => new Date(a.startTime) - new Date(b.startTime));

  const TYPES = ["all","consultation","task","reminder","meeting","booking"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8f4] via-[#eefbf1] to-[#f3f4ef]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <CalendarDays size={18} className="text-green-700" />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-lg">Schedule</h1>
              <p className="text-slate-400 text-xs">Manage events, tasks & bookings</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition">
              <RefreshCw size={15} />
            </button>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={() => setView("calendar")}
                className={`p-1.5 rounded-lg transition ${view === "calendar" ? "bg-white shadow-sm text-green-700" : "text-slate-400 hover:text-slate-600"}`}>
                <LayoutGrid size={15} />
              </button>
              <button onClick={() => setView("list")}
                className={`p-1.5 rounded-lg transition ${view === "list" ? "bg-white shadow-sm text-green-700" : "text-slate-400 hover:text-slate-600"}`}>
                <List size={15} />
              </button>
            </div>
            <button onClick={() => openNew({})}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition shadow-sm">
              <Plus size={15} /> New Event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT: Calendar / List ─────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Upcoming strip */}
            {upcoming.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-500 mb-3">Upcoming this week</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {upcoming.slice(0, 5).map(ev => (
                    <button key={ev._id} onClick={() => setSelectedEvent(ev)}
                      className={`shrink-0 border-l-4 rounded-xl px-3 py-2.5 text-left min-w-[140px] hover:shadow-md transition ${TYPE_COLOR[ev.type] || "border-l-slate-300 bg-slate-50"}`}>
                      <p className="text-[10px] text-slate-500 mb-0.5">
                        {new Date(ev.startTime).toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" })}
                      </p>
                      <p className="text-xs font-semibold text-slate-800 truncate">{ev.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(ev.startTime).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Calendar or List */}
            {view === "calendar" ? (
              <CalendarView
                events={events.map(e => ({ ...e, startTime: e.startTime?.slice(0,10) }))}
                onDayClick={({ day, month, year }) => {
                  const d = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  openNew({ startTime: `${d}T09:00`, endTime: `${d}T10:00` });
                }}
                onEventClick={setSelectedEvent}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                {/* Type filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filterType === t ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>

                {evLoading ? (
                  <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">No events found</div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(ev => (
                      <motion.button key={ev._id} layout
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-l-4 text-left hover:shadow-sm transition ${TYPE_COLOR[ev.type] || "border-l-slate-300 bg-slate-50"}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[ev.status] || "bg-slate-400"}`} />
                            <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 ml-3.5">
                            {new Date(ev.startTime).toLocaleString("en-IN", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize shrink-0">{ev.priority}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Event detail panel */}
            {selectedEvent && (
              <EventDetailsPanel
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onEdit={(ev) => { openEdit(ev); setSelectedEvent(null); }}
              />
            )}

            <TaskList tasks={tasks} loading={taskLoading} />
            <AIScheduler onUseSlot={handleAISlot} />
            <ScheduleAnalytics />
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditEvent(null); }}
        onSave={handleSave}
        onDelete={(id) => deleteMut.mutate(id)}
        initial={editEvent}
        loading={createMut.isPending || updateMut.isPending}
      />
    </div>
  );
}
