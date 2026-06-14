import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, FileText, PenLine, AlertTriangle, Clock, Banknote, DollarSign, X, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";

const typeConfig = {
  contract_received: { icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10" },
  contract_signed:   { icon: PenLine, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  contract_cancelled:{ icon: X, color: "text-rose-400", bg: "bg-rose-500/10" },
  dispute_filed:     { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  dispute_window_closed: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  ach_initiated:     { icon: Banknote, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  payment_received:  { icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  signature_added:   { icon: PenLine, color: "text-violet-400", bg: "bg-violet-500/10" },
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 30),
    refetchInterval: 15000,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneRead = async (n) => {
    if (!n.read) {
      await base44.entities.Notification.update(n.id, { read: true });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full ring-2 ring-zinc-950" aria-hidden="true" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-12 w-[calc(100vw-16px)] sm:w-96 max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[100] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <span className="font-semibold text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-zinc-800/60">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-zinc-600 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-zinc-400 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => {
                  const cfg = typeConfig[n.type] || typeConfig.contract_received;
                  const Icon = cfg.icon;
                  const inner = (
                    <div className={`flex gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left w-full ${!n.read ? 'bg-zinc-800/30' : ''}`}>
                      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${n.read ? 'text-zinc-300' : 'text-white'}`}>{n.title}</p>
                          {!n.read && (
                            <span
                              role="img"
                              aria-label="Unread"
                              className="shrink-0 w-2 h-2 mt-1 rounded-full bg-violet-500"
                            />
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );

                  return n.contract_id ? (
                    <Link
                      key={n.id}
                      to={`${createPageUrl("ContractDetail")}?id=${n.contract_id}`}
                      onClick={() => { markOneRead(n); setOpen(false); }}
                      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markOneRead(n)}
                      className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-inset"
                    >
                      {inner}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}