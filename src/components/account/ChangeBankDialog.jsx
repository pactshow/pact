import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getStripe } from '@/lib/stripe';

export default function ChangeBankDialog({ open, onOpenChange, payerName, payerEmail, onChanged }) {
  const [setup, setSetup] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setSetup(null);
      setLoadError(null);
      setDone(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('createBankChangeSetup', {});
        if (cancelled) return;
        if (!res?.client_secret) {
          setLoadError(res?.error || 'Failed to start bank change');
          return;
        }
        setSetup({
          client_secret: res.client_secret,
          setup_intent_id: res.setup_intent_id,
        });
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to start bank change');
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleClose = (o) => {
    onOpenChange(o);
    if (!o && done) onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        {done ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Bank updated
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2">
                Your next subscription charge will pull from this bank.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-2">
              <Button
                onClick={() => handleClose(false)}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-white">Change billing bank</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Link a different bank account. We'll use it for your next subscription charge.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>No card option — Pact only bills via ACH bank transfer.</span>
            </div>

            {loadError && <p className="text-sm text-rose-400">{loadError}</p>}

            {!setup && !loadError && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            {setup && (
              <Elements
                stripe={getStripe()}
                options={{
                  clientSecret: setup.client_secret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#8b5cf6',
                      colorBackground: '#18181b',
                      colorText: '#fafafa',
                      colorDanger: '#f43f5e',
                      borderRadius: '8px',
                    },
                  },
                }}
              >
                <BankChangeForm
                  setupIntentId={setup.setup_intent_id}
                  payerName={payerName}
                  payerEmail={payerEmail}
                  onClose={() => onOpenChange(false)}
                  onSubmitted={() => setDone(true)}
                />
              </Elements>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BankChangeForm({ setupIntentId, payerName, payerEmail, onClose, onSubmitted }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !elementReady) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Please complete the bank link form');
        setSubmitting(false);
        return;
      }
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/Profiles?bank_changed=1`,
        },
        redirect: 'if_required',
      });
      if (confirmError) {
        setError(confirmError.message || 'Bank link failed');
        setSubmitting(false);
        return;
      }
      if (setupIntent?.status !== 'succeeded') {
        setError('Bank link did not complete. Please try again.');
        setSubmitting(false);
        return;
      }
      const finalize = await base44.functions.invoke('finalizeBankChange', {
        setup_intent_id: setupIntentId,
      });
      if (!finalize?.ok) {
        setError(finalize?.error || 'Failed to apply new bank');
        setSubmitting(false);
        return;
      }
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Bank link failed');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!elementReady && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      )}
      <PaymentElement
        onReady={() => setElementReady(true)}
        options={{
          defaultValues: {
            billingDetails: {
              name: payerName || '',
              email: payerEmail || '',
            },
          },
        }}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elementReady || submitting}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Use this bank'}
        </Button>
      </div>
    </form>
  );
}
