import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Landmark, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import ConnectOnboardingDialog from './ConnectOnboardingDialog';

// Controlled two-step bank-setup flow: intro modal explaining why →
// embedded Stripe Connect onboarding. Exposes `open` and `onOpenChange`
// so callers can pop it from any context (auto-pop on first visit, or
// on sign-button click, etc.).
export default function BankSetupFlow({
  profileId,
  open,
  onOpenChange,
  title = 'Add a bank to get paid',
  description = "Before anyone can pay you on Pact., we need to verify your identity and link the bank where you'd like payouts sent. Takes a few minutes.",
  dismissLabel = "I'll do this later",
}) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('intro'); // 'intro' | 'connect'

  // Whenever the dialog closes, reset the stage so reopening starts at
  // intro again rather than dropping the user back into the Connect
  // iframe mid-flow.
  useEffect(() => {
    if (!open) setStage('intro');
  }, [open]);

  const startConnect = () => setStage('connect');
  const closeAll = () => onOpenChange(false);

  const onConnectComplete = async () => {
    try {
      await base44.functions.invoke('refreshConnectStatus', { profile_id: profileId });
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (err) {
      console.error('Refresh status error:', err);
    }
  };

  if (!profileId) return null;

  return (
    <>
      <Dialog open={open && stage === 'intro'} onOpenChange={onOpenChange}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <div className="mx-auto p-3 rounded-2xl bg-violet-500/10 w-fit mb-3">
              <Landmark className="w-7 h-7 text-violet-400" />
            </div>
            <DialogTitle className="text-center text-white">{title}</DialogTitle>
            <DialogDescription className="text-center text-zinc-400">
              {description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2 mt-2">
            <Button
              onClick={startConnect}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11 w-full"
            >
              Set up payouts
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button
              type="button"
              onClick={closeAll}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              {dismissLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConnectOnboardingDialog
        profileId={profileId}
        open={open && stage === 'connect'}
        onOpenChange={(o) => {
          if (!o) closeAll();
        }}
        onComplete={onConnectComplete}
      />
    </>
  );
}
