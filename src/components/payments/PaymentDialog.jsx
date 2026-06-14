import { useEffect, useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { getStripe } from "@/lib/stripe";
import { formatUSD } from "@/lib/feeMath";

function PaymentForm({ payment, chargeCents, payerName, payerEmail, onClose, onSubmitted }) {
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
        setError(submitError.message || 'Please complete the payment form');
        setSubmitting(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/ContractDetail?id=${payment.contract_id}&payment=success&payment_id=${payment.id}`,
        },
        redirect: 'if_required',
      });
      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setSubmitting(false);
        return;
      }
      onSubmitted?.();
    } catch (err) {
      setError(err.message || 'Payment failed');
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
      {error && (
        <p role="alert" aria-live="assertive" className="text-sm text-rose-400">{error}</p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="h-11 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elementReady || submitting}
          className="h-11 bg-violet-600 hover:bg-violet-500 text-white"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            `Pay ${formatUSD(chargeCents)}`
          )}
        </Button>
      </div>
    </form>
  );
}

export default function PaymentDialog({ payment, open, onOpenChange, onSuccess }) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState(null);
  const [intent, setIntent] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open || !payment) {
      setClientSecret(null);
      setIntent(null);
      setLoadError(null);
      setSubmitted(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('createPaymentIntent', {
          payment_id: payment.id,
        });
        if (cancelled) return;
        if (res?.client_secret) {
          setClientSecret(res.client_secret);
          setIntent(res);
        } else {
          setLoadError(res?.error || 'Failed to start payment');
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || 'Failed to start payment');
      }
    })();
    return () => { cancelled = true; };
  }, [open, payment]);

  // Authoritative charge amount comes from the edge fn; fall back to the
  // payment row's dollar amount (× 100) so the UI still renders if the
  // intent hasn't loaded yet.
  const chargeCents = intent?.charge_amount_cents
    ?? Math.round(Number(payment?.amount ?? 0) * 100);
  const clientFeeCents = intent?.client_fee_cents ?? 0;
  const feePayer = intent?.fee_payer ?? 'contractor';

  const handleClose = (o) => {
    onOpenChange(o);
    if (!o && submitted) onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        {submitted ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Payment submitted
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2">
                Your ACH transfer for <span className="text-white font-semibold">{formatUSD(chargeCents)}</span> has been authorized. It typically takes 3–5 business days for the funds to clear. You'll see this payment update automatically once it settles.
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
              <DialogTitle className="text-white">
                Pay {formatUSD(chargeCents)}
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Link your bank account to authorize an ACH transfer. Funds typically clear in 3–5 business days.
                {clientFeeCents > 0 && (
                  <span className="block mt-2 text-xs text-zinc-500">
                    Includes a {feePayer === 'split' ? 'split ' : ''}Pact fee of {formatUSD(clientFeeCents)}.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {loadError && (
              <p className="text-sm text-rose-400">{loadError}</p>
            )}

            {!clientSecret && !loadError && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            {clientSecret && (
              <Elements
                stripe={getStripe()}
                options={{
                  clientSecret,
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
                <PaymentForm
                  payment={payment}
                  chargeCents={chargeCents}
                  payerName={payment?.payer_name || user?.user_metadata?.name || ''}
                  payerEmail={user?.email || ''}
                  onClose={() => onOpenChange(false)}
                  onSubmitted={() => setSubmitted(true)}
                />
              </Elements>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
