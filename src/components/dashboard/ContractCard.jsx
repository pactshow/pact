import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statusStyles = {
  draft: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  received: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  signed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  completed: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  countered: "bg-orange-500/20 text-orange-300 border-orange-500/30"
};

export default function ContractCard({ contract, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={createPageUrl(`ContractDetail?id=${contract.id}`)}
        className="block group"
      >
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 hover:border-violet-500/50 transition-all duration-300 hover:bg-zinc-900/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                  {contract.title}
                </h3>
                <Badge className={`${statusStyles[contract.status]} border text-xs`}>
                  {contract.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">{contract.contractor_name}</span>
                <span className="text-zinc-600">•</span>
                <span>{contract.client_name}</span>
              </div>
              
              <div className="flex items-center gap-5 mt-3 text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {contract.performance_date
                    ? contract.performance_end_date
                      ? `${format(parseISO(contract.performance_date), "MMM d")} → ${format(parseISO(contract.performance_end_date), "MMM d, yyyy")}`
                      : format(parseISO(contract.performance_date), "MMM d, yyyy")
                    : "TBD"}
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  ${contract.total_amount?.toLocaleString()}
                </div>
              </div>
            </div>
            
            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors flex-shrink-0 mt-1" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}