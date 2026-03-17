import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_COLOR = {
  consultation: "bg-violet-100 text-violet-700",
  task:         "bg-amber-100 text-amber-700",
  reminder:     "bg-sky-100 text-sky-700",
  meeting:      "bg-emerald-100 text-emerald-700",
  booking:      "bg-rose-100 text-rose-700",
};

export default function CalendarView({ events = [], onDayClick, onEventClick }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year,  setYear]  = useState(now.getFullYear());

  const navMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  };

  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDay     = new Date(year, month, 1).getDay();
  const isToday      = (d) => d === now.getDate() && month === now.getMonth() && year === now.getFullYear();

  const eventsForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.filter(e => e.startTime?.startsWith(dateStr));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-base font-semibold text-slate-800">{MONTHS[month]} {year}</h2>
        <button onClick={() => navMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-slate-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsForDay(day);
          const today = isToday(day);
          return (
            <motion.div
              key={day}
              whileHover={{ scale: 1.02 }}
              onClick={() => onDayClick?.({ day, month, year })}
              className={`min-h-[72px] rounded-xl border cursor-pointer p-1.5 transition-all overflow-hidden
                ${today ? "border-green-400 bg-green-50" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200"}`}
            >
              <div className={`text-[11px] font-semibold mb-1 ${today ? "text-green-700" : "text-slate-500"}`}>{day}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev._id}
                    onClick={e => { e.stopPropagation(); onEventClick?.(ev); }}
                    className={`text-[9px] truncate px-1 py-0.5 rounded font-medium cursor-pointer ${TYPE_COLOR[ev.type] || "bg-slate-100 text-slate-600"}`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-slate-400 px-1">+{dayEvents.length - 2}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
        {Object.entries(TYPE_COLOR).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cls.split(" ")[0]}`} />
            <span className="text-[10px] text-slate-500 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
