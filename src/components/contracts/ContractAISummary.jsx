import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Loader2, AlertCircle, Calendar, DollarSign, Briefcase, ShieldAlert, FileText, Clock } from "lucide-react";

const categoryIcons = {
  payment: DollarSign,
  performance: Briefcase,
  cancellation: ShieldAlert,
  schedule: Calendar,
  requirements: FileText,
  general: Clock,
};

const categoryColors = {
  payment: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  performance: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  cancellation: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  schedule: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  requirements: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  general: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

function SummaryItem({ item }) {
  const Icon = categoryIcons[item.category] || FileText;
  const colorClass = categoryColors[item.category] || categoryColors.general;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border p-4 ${colorClass}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{item.label}</p>
          <p className="text-sm font-medium leading-relaxed">{item.value}</p>
        </div>
      </div>
    </motion.div>
  );
}

const AI_SUMMARY_ENABLED = true;

function ContractAISummaryImpl({ contract }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAnalyze = async () => {
    setDialogOpen(true);
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const result = await base44.functions.invoke('analyzeContract', {
        contract_id: contract.id,
      });
      if (result?.error) throw new Error(result.error);
      setSummary(result);
    } catch (err) {
      console.error('analyzeContract failed:', err);
      setError(err.message || 'Failed to analyze contract.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-gradient-to-br from-violet-950/60 via-purple-950/40 to-zinc-900/60 border border-violet-500/30 p-5"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1.5 rounded-lg bg-violet-500/20">
            <Sparkles className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Contract Analysis</h3>
            <p className="text-xs text-zinc-400">Plain-English breakdown of key terms</p>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Get a clear, jargon-free summary of payment terms, obligations, cancellation policies, and more.
        </p>
        <Button
          onClick={handleAnalyze}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 rounded-xl"
        >
          <Sparkles className="w-4 h-4" />
          Analyze Contract
        </Button>
      </motion.div>

      {/* Results Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              AI Contract Analysis
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Plain-English breakdown of your contract's key terms
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
              <p className="text-sm text-zinc-400">Reading and analyzing your contract…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm py-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summary && !loading && (
            <div className="space-y-3 mt-2">
              {summary.overall_summary && (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">Overview</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">{summary.overall_summary}</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3">
                {summary.items?.map((item, i) => (
                  <SummaryItem key={i} item={item} />
                ))}
              </div>
              <div className="pt-2 text-right">
                <button
                  onClick={handleAnalyze}
                  className="text-xs text-zinc-500 hover:text-violet-400 transition-colors flex items-center gap-1 ml-auto"
                >
                  <Sparkles className="w-3 h-3" /> Re-analyze
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ContractAISummary(props) {
  if (!AI_SUMMARY_ENABLED) return null;
  return <ContractAISummaryImpl {...props} />;
}