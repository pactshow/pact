import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Check, Loader2, Mic2, Building2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useMyProfile } from '@/lib/RoleContext';
import { useAuth } from '@/lib/AuthContext';
import { getStripe } from '@/lib/stripe';

const TIERS = {
  artist: [
    {
      key: 'artist_basic',
      name: 'Artist Basic',
      monthly: 25,
      tagline: 'Everything you need to send contracts and get paid.',
      features: [
        'Unlimited contracts',
        'ACH bank payouts via Stripe',
        'Built-in dispute window',
        'Standard clause library',
        '2% per transaction',
      ],
    },
    {
      key: 'artist_pro',
      name: 'Artist Pro',
      monthly: 40,
      tagline: 'For touring artists who run a real operation.',
      features: [
        'Everything in Basic',
        'Save reusable contract templates',
        'Upload your own PDF contracts',
        'W-9 / 1099 tax reporting',
        'Add your own custom clauses',
        'Group contracts into Tours',
      ],
    },
  ],
  promoter: [
    {
      key: 'promoter_basic',
      name: 'Promoter Basic',
      monthly: 79,
      tagline: 'Send contracts, pay artists, stay organized.',
      features: [
        'Unlimited contracts',
        'Pay artists via ACH bank transfer',
        'Built-in dispute window',
        'Standard clause library',
        '2% per transaction',
      ],
    },
    {
      key: 'promoter_pro',
      name: 'Promoter Pro',
      monthly: 149,
      tagline: 'For venues and bookers running multi-artist shows.',
      features: [
        'Everything in Basic',
        'Save reusable contract templates',
        'Upload your own PDF contracts',
        'W-9 / 1099 tax reporting',
        'Add your own custom clauses',
        'Group contracts into Events',
      ],
    },
  ],
};

export default function Onboarding() {
  const { myProfile } = useMyProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Guest-upgrade entry: user already picked a side, now choosing a tier.
  // Start at step 2 with the side pre-filled from their existing profile.
  const upgradeMode = searchParams.get('upgrade') === '1' && !!myProfile?.user_side;

  const [step, setStep] = useState(upgradeMode ? 2 : 1);
  const [side, setSide] = useState(upgradeMode ? myProfile.user_side : null);
  const [tier, setTier] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [guestBusy, setGuestBusy] = useState(false);

  // Step 3 — bank link
  const [setup, setSetup] = useState(null); // { client_secret, setup_intent_id, customer_id }
  const [setupLoading, setSetupLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const pickSide = (s) => {
    setSide(s);
    setTier(null);
    setStep(2);
  };

  const continueAsGuest = async () => {
    if (!side || !myProfile?.id) return;
    setGuestBusy(true);
    setSetupError(null);
    try {
      await base44.entities.Profile.update(myProfile.id, { user_side: side });
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      // App.jsx gate flips to Dashboard once user_side is set.
    } catch (err) {
      setSetupError(err.message || 'Failed to continue as Guest');
    } finally {
      setGuestBusy(false);
    }
  };

  const continueToBankLink = async () => {
    if (!side || !tier) return;
    setStep(3);
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res = await base44.functions.invoke('createSubscriptionSetup', { side, tier });
      if (!res?.client_secret) throw new Error(res?.error || 'Failed to start bank setup');
      setSetup({
        client_secret: res.client_secret,
        setup_intent_id: res.setup_intent_id,
        customer_id: res.customer_id,
      });
    } catch (err) {
      setSetupError(err.message || 'Failed to start bank setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const finalizeAndEnter = async () => {
    if (!setup) return;
    setSetupError(null);
    try {
      const res = await base44.functions.invoke('finalizeSubscription', {
        side,
        tier,
        customer_id: setup.customer_id,
        setup_intent_id: setup.setup_intent_id,
      });
      if (!res?.ok) throw new Error(res?.error || 'Failed to start your trial');
      setCompleted(true);
      // Brief success beat before App.jsx gate flips us to Dashboard.
      await new Promise(r => setTimeout(r, 1200));
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['my-subscription'] });
      // Upgrade mode: user_side was already set, so App.jsx gate won't
      // redirect — push them back to the dashboard manually.
      if (upgradeMode) navigate('/');
    } catch (err) {
      setSetupError(err.message || 'Failed to start your trial');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {upgradeMode ? 'Upgrade your plan' : 'Welcome to Pact.'}
          </h1>
          <p className="mt-2 text-zinc-400">
            {step === 1 && "Two quick questions to get you set up."}
            {step === 2 && `Pick a plan — 30 days free, no charge until ${trialEndLabel()}.`}
            {step === 3 && "Link your bank to start your free trial."}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <SideCard
                icon={Mic2}
                title="I'm here to be hired"
                subtitle="Artists, DJs, performers — receive contracts and get paid."
                onClick={() => pickSide('artist')}
              />
              <SideCard
                icon={Building2}
                title="I'm here to do the hiring"
                subtitle="Venues, promoters, bookers — send contracts and pay artists."
                onClick={() => pickSide('promoter')}
              />
            </motion.div>
          )}

          {step === 2 && side && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {TIERS[side].map((t) => (
                  <TierCard
                    key={t.key}
                    tier={t}
                    selected={tier === t.key}
                    onSelect={() => setTier(t.key)}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between">
                {upgradeMode ? (
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/Profiles')}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => { setStep(1); setTier(null); }}
                    className="text-zinc-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={continueToBankLink}
                  disabled={!tier}
                  className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6"
                >
                  Continue
                </Button>
              </div>

              {!upgradeMode && (
                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-sm text-zinc-400 mb-3">
                    Just here to sign a contract someone sent you?
                  </p>
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    disabled={guestBusy}
                    className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-400 disabled:opacity-50"
                  >
                    {guestBusy ? 'Setting up…' : 'Continue as a free Guest — sign and get paid, no monthly fee'}
                  </button>
                  {setupError && (
                    <p className="text-sm text-rose-400 mt-3">{setupError}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto"
            >
              <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <p className="text-sm text-zinc-300">
                    No charge today. We'll auto-debit your bank when your 30-day trial ends.
                  </p>
                </div>

                {setupLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                  </div>
                )}

                {setupError && (
                  <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 mb-4">
                    {setupError}
                  </div>
                )}

                {completed && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-3 rounded-full bg-emerald-500/15 mb-3">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold">You're all set.</p>
                    <p className="text-sm text-zinc-400 mt-1">Welcome to Pact.</p>
                  </div>
                )}

                {setup && !completed && (
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
                    <BankLinkForm
                      payerName={myProfile?.name || ''}
                      payerEmail={myProfile?.email || user?.email || ''}
                      onLinked={finalizeAndEnter}
                      onBack={() => { setStep(2); setSetup(null); setSetupError(null); }}
                    />
                  </Elements>
                )}

                {!setup && !setupLoading && setupError && (
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => { setStep(2); setSetupError(null); }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      onClick={continueToBankLink}
                      className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Try again
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function BankLinkForm({ payerName, payerEmail, onLinked, onBack }) {
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
          // Most ACH+FC flows resolve in-modal and never redirect, but
          // Stripe requires the param. If a redirect is needed (e.g.
          // micro-deposits fallback), come back here.
          return_url: `${window.location.origin}/?onboarding=complete`,
        },
        redirect: 'if_required',
      });
      if (confirmError) {
        setError(confirmError.message || 'Bank link failed');
        setSubmitting(false);
        return;
      }
      if (setupIntent?.status === 'succeeded') {
        await onLinked();
      } else {
        setError('Bank link did not complete. Please try again.');
        setSubmitting(false);
      }
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
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || !elementReady || submitting}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 px-6"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start 30-day free trial'}
        </Button>
      </div>
    </form>
  );
}

function SideCard({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 hover:border-violet-500/50 hover:bg-zinc-900 transition-all group"
    >
      <div className="p-3 rounded-xl bg-violet-500/10 w-fit mb-4 group-hover:bg-violet-500/20 transition-colors">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400">{subtitle}</p>
    </button>
  );
}

function TierCard({ tier, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-2xl p-6 border transition-all ${
        selected
          ? 'bg-violet-500/10 border-violet-500'
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
          <p className="text-sm text-zinc-400 mt-0.5">{tier.tagline}</p>
        </div>
        {selected && (
          <div className="p-1 rounded-full bg-violet-500 shrink-0">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>
      <div className="mb-4">
        <span className="text-3xl font-bold text-white">${tier.monthly}</span>
        <span className="text-zinc-400 text-sm">/month</span>
      </div>
      <ul className="space-y-2">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function trialEndLabel() {
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}
