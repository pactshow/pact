import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CancelSubscriptionDialog({ open, onOpenChange, accessUntil, onCanceled }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCancel = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('cancelSubscription', {});
      if (!res?.ok) throw new Error(res?.error || 'Failed to cancel');
      onCanceled?.();
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Cancel subscription
          </DialogTitle>
          <DialogDescription className="text-zinc-400 pt-2">
            You'll keep full access through{' '}
            <span className="text-white font-semibold">{accessUntil}</span>. After that,
            you won't be able to send new contracts until you resubscribe. You can change your mind
            and resume anytime before then.
          </DialogDescription>
        </DialogHeader>

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
            Keep subscription
          </Button>
          <Button
            onClick={handleCancel}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-500 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel subscription'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
