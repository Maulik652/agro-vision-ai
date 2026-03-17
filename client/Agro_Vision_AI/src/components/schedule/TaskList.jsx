import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Clock, Plus, Loader2, Flag, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTask, updateTask } from "../../api/scheduleApi";
import toast from "react-hot-toast";

const PRIORITY_CLS = {
  low:      "text-slate-400",
  medium:   "text-amber-500",
  high:     "text-orange-500",
  critical: "text-red-500",
};

const STATUS_CLS = {
  pending:     "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-emerald-100 text-emerald-700",
  cancelled:   "bg-red-100 text-red-600",
};

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-green-400 transition";

export default function TaskList({ tasks = [], loading }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", deadline: "", priority: "medium", taskType: "general" });

  const createMut = useMutation({
    mutationFn: createTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule-tasks"] }); setShowForm(false); setForm({ title:"", deadline:"", priority:"medium", taskType:"general" }); toast.success("Task created"); },
    onError: () => toast.error("Failed to create task"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateTask(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule-tasks"] }),
  });

  const toggle = (task) => {
    const next = task.status === "completed" ? "pending" : "completed";
    updateMut.mutate({ id: task._id, body: { status: next } });
  };

  const pending   = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const completed = tasks.filter(t => t.status === "completed");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Tasks</h3>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-medium hover:bg-green-800 transition">
          {showForm ? <X size={12} /> : <Plus size={12} />}
          {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {/* Quick add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4">
            <div className="space-y-2 pb-4 border-b border-slate-100">
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title..." className={inputCls} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className={inputCls} />
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className={inputCls}>
                  {["low","medium","high","critical"].map(p => <option key={p} value={p} className="text-slate-800">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </div>
              <button onClick={() => form.title && createMut.mutate(form)} disabled={createMut.isPending || !form.title}
                className="w-full py-2 rounded-xl bg-green-700 text-white text-xs font-medium hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {createMut.isPending ? <Loader2 size={12} className="animate-spin" /> : null} Create Task
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {pending.map(task => (
            <TaskRow key={task._id} task={task} onToggle={toggle} />
          ))}
          {pending.length === 0 && completed.length === 0 && (
            <p className="text-center text-slate-400 text-xs py-6">No tasks yet</p>
          )}
          {completed.length > 0 && (
            <>
              <p className="text-[10px] text-slate-400 font-medium pt-2 pb-1">Completed ({completed.length})</p>
              {completed.slice(0, 3).map(task => (
                <TaskRow key={task._id} task={task} onToggle={toggle} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }) {
  const done = task.status === "completed";
  const overdue = task.deadline && !done && new Date(task.deadline) < new Date();

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl transition group ${overdue ? "bg-red-50 border border-red-100" : "hover:bg-slate-50"}`}>
      <button onClick={() => onToggle(task)} className="shrink-0 text-slate-400 hover:text-green-600 transition">
        {done ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${done ? "line-through text-slate-400" : "text-slate-700"}`}>{task.title}</p>
        {task.deadline && (
          <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${overdue ? "text-red-500" : "text-slate-400"}`}>
            <Clock size={9} /> {new Date(task.deadline).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
            {overdue && " · Overdue"}
          </p>
        )}
      </div>
      <Flag size={12} className={PRIORITY_CLS[task.priority] || "text-slate-400"} />
    </div>
  );
}
