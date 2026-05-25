import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth,
  isSameDay, isToday, format, parseISO
} from "date-fns";

const STATUS_COLORS = {
  draft:      "bg-zinc-600",
  sent:       "bg-amber-500",
  signed:     "bg-violet-500",
  completed:  "bg-emerald-500",
  cancelled:  "bg-rose-500",
};

export default function CalendarView({ contracts }) {
  const [current, setCurrent] = useState(new Date());
  const navigate = useNavigate();

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsOnDay = (day) =>
    contracts.filter(
      (c) => c.performance_date && isSameDay(parseISO(c.performance_date), day)
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden"
    >
      {/* Month Nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCurrent(subMonths(current, 1))}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold text-white">
          {format(current, "MMMM yyyy")}
        </h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setCurrent(addMonths(current, 1))}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-zinc-500 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const events = eventsOnDay(day);
          const inMonth = isSameMonth(day, current);
          const today = isToday(day);

          return (
            <div
              key={idx}
              className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-zinc-800/60 p-1.5
                ${inMonth ? "bg-zinc-900/30" : "bg-zinc-950/50"}
                ${idx % 7 === 6 ? "border-r-0" : ""}
              `}
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1
                  ${today ? "bg-violet-600 text-white" : inMonth ? "text-zinc-300" : "text-zinc-700"}
                `}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {events.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => navigate(createPageUrl(`ContractDetail?id=${contract.id}`))}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium
                      transition-opacity hover:opacity-80 cursor-pointer
                      ${STATUS_COLORS[contract.status] || "bg-zinc-600"} text-white`}
                    title={`${contract.title} — ${contract.contractor_name} @ ${contract.client_name}`}
                  >
                    <span className="hidden sm:inline">{contract.title || contract.contractor_name}</span>
                    <span className="sm:hidden">•</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-zinc-800">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}