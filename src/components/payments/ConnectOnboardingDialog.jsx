import { useEffect, useState } from "react";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { loadConnectForProfile } from "@/lib/stripe";

export default function ConnectOnboardingDialog({ profileId, open, onOpenChange, onComplete }) {
  const [connectInstance, setConnectInstance] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!open || !profileId) {
      setConnectInstance(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    try {
      const instance = loadConnectForProfile(profileId);
      if (!cancelled) setConnectInstance(instance);
    } catch (err) {
      if (!cancelled) setLoadError(err.message || 'Failed to load Connect onboarding');
    }
    return () => { cancelled = true; };
  }, [open, profileId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Set up payouts</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Verify your identity and link a bank account to receive payments from clients.
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-sm text-rose-400">{loadError}</p>}

        {!connectInstance && !loadError && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        )}

        {connectInstance && (
          <ConnectComponentsProvider connectInstance={connectInstance}>
            <ConnectAccountOnboarding
              onExit={() => {
                onComplete?.();
                onOpenChange(false);
              }}
            />
          </ConnectComponentsProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
