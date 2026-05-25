import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Landmark, CreditCard, AlertTriangle, RefreshCw, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { base44 } from '@/api/base44Client';
import { TIER_INFO } from './tierInfo';
import ChangePlanDialog from './ChangePlanDialog';
import ChangeBankDialog from './ChangeBankDialog';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';

export default function SubscriptionCard({ profile }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [planOpen, setPlanOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resumeBusy, setResumeBusy] = useState(false);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ['subscription-details', profile?.id],
    queryFn: () => base44.functions.invoke('getSubscriptionDetails', {}),
    enabled: !!profile?.id && !!subscription?.stripe_customer_id,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['my-subscription', profile?.id] });
    queryClient.invalidateQueries({ queryKey: ['subscription-details', profile?.id] });
  };

  const handleResume = async () => {
    setResumeBusy(true);
    try {
      const res = await base44.functions.invoke('resumeSubscription', {});
      if (!res?.ok) throw new Error(res?.error || 'Failed to resume');
      refreshAll();
    } catch (err) {
      alert(err.message || 'Failed to resume subscription');
    } finally {
      setResumeBusy(false);
    }
  };

  if (subLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!subscription) {
    // Guest tier — completed onboarding without picking a paid plan.
    // Can still sign contracts others send them; needs to upgrade to
    // create their own.
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Subscription</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your Pact. plan and billing.</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Current plan</p>
              <p className="text-xl font-semibold mt-0.5">Guest</p>
              <p className="text-zinc-400 text-sm">Free · sign &amp; get paid only</p>
            </div>
            <div className="p-2 rounded-xl bg-violet-500/10 shrink-0">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-400 space-y-1.5">
            <p>You can sign contracts and receive (or send) payments on contracts the other party created.</p>
            <p>Upgrade any time to send your own contracts, save templates, upload PDFs, and more.</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => navigate('/Onboarding?upgrade=1')}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-11 px-6"
          >
            Upgrade
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    );
  }

  const tier = TIER_INFO[subscription.tier];
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;

  const inTrial = status === 'trialing' && trialEndsAt;
  const trialDaysLeft = inTrial
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const accessUntil = (cancelAtPeriodEnd && periodEnd)
    ? formatDate(periodEnd)
    : (inTrial ? formatDate(trialEndsAt) : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Subscription</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Manage your Pact. plan and billing.</p>
        </div>
        <button
          onClick={refreshAll}
          className="text-zinc-500 hover:text-white p-1"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {status === 'past_due' && (
        <Banner color="rose" icon={AlertTriangle}>
          Your last ACH payment failed. Update your bank or check with your bank, then we'll retry automatically.
        </Banner>
      )}
      {status === 'unpaid' && (
        <Banner color="rose" icon={AlertTriangle}>
          We couldn't collect your subscription payment. Please change your bank to keep using Pact.
        </Banner>
      )}
      {status === 'canceled' && (
        <Banner color="zinc" icon={AlertTriangle}>
          Your subscription has ended. Resubscribe to keep using Pact.
        </Banner>
      )}
      {cancelAtPeriodEnd && status !== 'canceled' && periodEnd && (
        <Banner color="amber" icon={AlertTriangle}>
          Your subscription is set to cancel on <span className="font-semibold">{formatDate(periodEnd)}</span>.
          You can resume anytime before then.
        </Banner>
      )}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Current plan</p>
            <p className="text-xl font-semibold mt-0.5">{tier?.name ?? subscription.tier}</p>
            <p className="text-zinc-400 text-sm">${tier?.monthly}/month · 2% per transaction</p>
          </div>
          {status !== 'canceled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPlanOpen(true)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 shrink-0"
            >
              Change plan
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800">
          <Stat label="Status" value={statusLabel(status, cancelAtPeriodEnd)} />
          {inTrial && (
            <Stat
              label="Trial ends"
              value={`${formatDate(trialEndsAt)} · ${trialDaysLeft}d left`}
            />
          )}
          {!inTrial && periodEnd && (
            <Stat
              label={cancelAtPeriodEnd ? 'Access ends' : 'Next bill'}
              value={cancelAtPeriodEnd
                ? formatDate(periodEnd)
                : `$${tier?.monthly}.00 on ${formatDate(periodEnd)}`}
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Billing bank</p>
            {detailsLoading ? (
              <div className="flex items-center gap-2 mt-1 text-zinc-400 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
              </div>
            ) : details?.bank?.last4 ? (
              <p className="text-sm text-zinc-300 mt-0.5 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-zinc-500" />
                {details.bank.bank_name ?? 'Bank account'} ending in <span className="font-mono">•••• {details.bank.last4}</span>
              </p>
            ) : (
              <p className="text-sm text-zinc-400 mt-0.5">No bank on file.</p>
            )}
          </div>
          {status !== 'canceled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBankOpen(true)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 shrink-0"
            >
              Change bank
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-3">Billing history</p>
        {detailsLoading && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        )}
        {!detailsLoading && (!details?.billing_history || details.billing_history.length === 0) && (
          <p className="text-sm text-zinc-500">
            No invoices yet — you're in your free trial. Your first bill will appear here after your trial ends.
          </p>
        )}
        {!detailsLoading && details?.billing_history?.length > 0 && (
          <ul className="space-y-2">
            {details.billing_history.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-300">{formatDate(new Date(inv.created * 1000))}</span>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-300 font-mono">${(inv.amount_paid / 100).toFixed(2)}</span>
                  {inv.hosted_invoice_url && (
                    <a
                      href={inv.hosted_invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:text-violet-300 inline-flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {cancelAtPeriodEnd && status !== 'canceled' && (
          <Button
            onClick={handleResume}
            disabled={resumeBusy}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {resumeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Resume subscription'}
          </Button>
        )}
        {!cancelAtPeriodEnd && status !== 'canceled' && (
          <Button
            variant="ghost"
            onClick={() => setCancelOpen(true)}
            className="text-zinc-400 hover:text-rose-400"
          >
            Cancel subscription
          </Button>
        )}
      </div>

      <ChangePlanDialog
        open={planOpen}
        onOpenChange={setPlanOpen}
        currentTier={subscription.tier}
        side={profile.user_side}
        onChanged={refreshAll}
      />
      <ChangeBankDialog
        open={bankOpen}
        onOpenChange={setBankOpen}
        payerName={profile.name}
        payerEmail={profile.email}
        onChanged={refreshAll}
      />
      <CancelSubscriptionDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        accessUntil={accessUntil ?? 'the end of your current period'}
        onCanceled={refreshAll}
      />
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-200 mt-0.5">{value}</p>
    </div>
  );
}

function Banner({ color, icon: Icon, children }) {
  const styles = {
    rose: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    zinc: 'bg-zinc-800/60 border-zinc-700 text-zinc-300',
  }[color] ?? 'bg-zinc-800/60 border-zinc-700 text-zinc-300';
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm flex items-start gap-2 ${styles}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const map = {
    paid: { label: 'Paid', cls: 'bg-emerald-500/15 text-emerald-300' },
    open: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300' },
    uncollectible: { label: 'Failed', cls: 'bg-rose-500/15 text-rose-300' },
    void: { label: 'Voided', cls: 'bg-zinc-700 text-zinc-300' },
    draft: { label: 'Draft', cls: 'bg-zinc-700 text-zinc-300' },
  };
  const m = map[status] ?? { label: status, cls: 'bg-zinc-700 text-zinc-300' };
  return <span className={`text-xs px-2 py-0.5 rounded ${m.cls}`}>{m.label}</span>;
}

function statusLabel(status, cancelAtPeriodEnd) {
  if (cancelAtPeriodEnd && status !== 'canceled') return 'Active · cancels at period end';
  return {
    trialing: 'Free trial',
    active: 'Active',
    past_due: 'Past due',
    canceled: 'Canceled',
    incomplete: 'Setup incomplete',
    incomplete_expired: 'Setup expired',
    unpaid: 'Unpaid',
  }[status] ?? status;
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
