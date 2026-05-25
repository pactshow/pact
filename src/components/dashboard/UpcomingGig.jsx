import { motion } from "framer-motion";
import { format, differenceInDays, parseISO } from "date-fns";
import { MapPin, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

export default function UpcomingGig({ contract, index = 0 }) {
  const daysUntil = contract.performance_date 
    ? differenceInDays(parseISO(contract.performance_date), new Date())
    : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-fuchsia-600/20 border border-violet-500/20 p-5"
    >
      {daysUntil !== null && daysUntil >= 0 && (
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
          <span className="text-sm font-medium text-white">
            {daysUntil === 0 ? 'Today!' : `${daysUntil} days`}
          </span>
        </div>
      )}
      
      <div className="space-y-3">
        <div>
          <p className="text-xs text-violet-300 uppercase tracking-wider font-medium">
            {contract.performance_date
              ? contract.performance_end_date
                ? `${format(parseISO(contract.performance_date), "MMM d")} → ${format(parseISO(contract.performance_end_date), "MMM d")}`
                : format(parseISO(contract.performance_date), "EEEE, MMM d")
              : "Date TBD"}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{contract.title}</h3>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-zinc-300">
          <MapPin className="w-4 h-4 text-violet-400" />
          {contract.client_name}
        </div>
        
        {contract.performance_time && (
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <Clock className="w-4 h-4 text-violet-400" />
            {formatTime(contract.performance_time)}
          </div>
        )}
        
        <div className="pt-2 border-t border-white/10">
          <p className="text-2xl font-bold text-amber-400">
            ${contract.total_amount?.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}