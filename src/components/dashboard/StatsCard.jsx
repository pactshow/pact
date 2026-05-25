import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, accentColor = "purple" }) {
  const colorMap = {
    purple: "from-violet-500/20 to-purple-500/10 border-violet-500/20",
    gold: "from-amber-500/20 to-yellow-500/10 border-amber-500/20",
    emerald: "from-emerald-500/20 to-green-500/10 border-emerald-500/20",
    rose: "from-rose-500/20 to-pink-500/10 border-rose-500/20"
  };

  const iconColorMap = {
    purple: "text-violet-400",
    gold: "text-amber-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[accentColor]} border backdrop-blur-sm p-6 hover:scale-[1.02] transition-transform cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          )}
          {trend && (
            <p className={`mt-2 text-sm font-medium ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend > 0 ? '+' : ''}{trend}% from last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-white/5 ${iconColorMap[accentColor]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </motion.div>
  );
}