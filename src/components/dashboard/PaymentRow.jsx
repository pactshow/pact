import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";

const statusStyles = {
  pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  processing: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  overdue: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  cancelled: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
};

const statusLabels = {
  pending: "pending",
  processing: "processing",
  paid: "payment sent",
  overdue: "overdue",
  cancelled: "cancelled"
};

const typeLabels = {
  deposit: "Deposit",
  balance: "Balance",
  full_payment: "Full Payment",
  bonus: "Bonus",
  other: "Other"
};

export default function PaymentRow({ payment, index = 0, onPay, payingId, payDisabledReason }) {
  const isIncoming = payment.type === "deposit" || payment.type === "balance" || payment.type === "full_payment";
  const canPay = Boolean(onPay) && payment.status === 'pending' && !payment.stripe_charge_id;
  const isPaying = payingId === payment.id;
  const blocked = canPay && Boolean(payDisabledReason);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start justify-between gap-3 py-4 border-b border-zinc-800/50 last:border-0"
    >
      <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
        <div className={`p-2.5 rounded-xl shrink-0 ${isIncoming ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
          {isIncoming ? (
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-rose-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{typeLabels[payment.type]}</p>
          <p className="text-sm text-zinc-500 truncate">
            {payment.payer_name && `From ${payment.payer_name}`}
            {payment.due_date && ` • Due ${format(parseISO(payment.due_date), "MMM d")}`}
          </p>
          {payment.status === 'processing' && (
            <p className="text-xs text-sky-300/80 mt-0.5">
              ACH typically clears in 3–5 business days
            </p>
          )}
          {blocked && (
            <p className="text-xs text-zinc-400 mt-0.5">{payDisabledReason}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p className={`font-semibold whitespace-nowrap ${isIncoming ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isIncoming ? '+' : '-'}${payment.amount?.toLocaleString()}
        </p>
        <Badge className={`${statusStyles[payment.status]} border text-xs whitespace-nowrap`}>
          {statusLabels[payment.status] ?? payment.status}
        </Badge>
        {canPay && (
          <Button
            size="sm"
            disabled={isPaying || blocked}
            onClick={() => onPay(payment)}
            className="bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 mt-1"
          >
            {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
