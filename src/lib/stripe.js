// Use the /pure entry points so the Stripe SDK script is NOT injected
// on every page load — only when loadStripe() / loadConnectAndInitialize()
// is actually invoked. The default entry auto-loads js.stripe.com/v3 on
// import, which adds ~488 KiB of JS and sets a third-party tracking
// cookie (m.stripe.com) on pages that have nothing to do with payments.
import { loadStripe } from '@stripe/stripe-js/pure';
import { loadConnectAndInitialize } from '@stripe/connect-js/pure';
import { base44 } from '@/api/base44Client';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  console.error('VITE_STRIPE_PUBLISHABLE_KEY is not set');
}

let stripePromise;
export function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export function loadConnectForProfile(profileId) {
  return loadConnectAndInitialize({
    publishableKey,
    fetchClientSecret: async () => {
      const res = await base44.functions.invoke('createConnectAccountSession', {
        profile_id: profileId,
      });
      if (!res?.client_secret) {
        throw new Error(res?.error || 'Failed to create Connect session');
      }
      return res.client_secret;
    },
    appearance: {
      overlays: 'dialog',
      variables: {
        colorPrimary: '#8b5cf6',
        colorBackground: '#0a0a0a',
        colorText: '#ffffff',
        buttonPrimaryColorBackground: '#8b5cf6',
        buttonPrimaryColorText: '#ffffff',
      },
    },
  });
}
