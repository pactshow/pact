import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TIER_INFO } from './tierInfo';

export default function ChangePlanDialog({ open, onOpenChange, currentTier, side, onChanged }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Pro <-> Basic toggle within the same side. Side switches are not
  // exposed here — those are profile changes, not tier changes.
  const otherTier = currentTier?.endsWith('_pro') ? `${side}_basic` : `${side}_pro`;
  const current = TIER_INFO[currentTier];
  const target = TIER_INFO[otherTier];

  const handleSwitch = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('updateSubscription', { new_tier: otherTier });
      if (!res?.ok) throw new Error(res?.error || 'Failed to change plan');
      onChanged?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to change plan');
    } finally {
      setSubmitting(false);
    }
  };

  if (!current || !target) return null;

  const upgrading = otherTier.endsWith('_pro');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {upgrading ? 'Upgrade to Pro' : 'Switch to Basic'}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {upgrading
              ? `You'll get all the Pro features starting today. We'll prorate the difference on your next bill.`
              : `You'll lose access to Pro features at the end of your current billing period. Any prorated credit goes toward your next bill.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
            <p className="text-xs text-zinc-500">Current</p>
            <p className="font-semibold">{current.name}</p>
            <p className="text-sm text-zinc-400">${current.monthly}/mo</p>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />
          <div className="flex-1 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3">
            <p className="text-xs text-violet-300">New</p>
            <p className="font-semibold">{target.name}</p>
            <p className="text-sm text-zinc-300">${target.monthly}/mo</p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Keep current plan
          </Button>
          <Button
            onClick={handleSwitch}
            disabled={submitting}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Switch to ${target.name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
