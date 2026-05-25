// Display metadata for tiers — shared by SubscriptionCard +
// ChangePlanDialog so labels/prices stay in sync. The authoritative
// price still lives in Stripe; this is purely UI.
export const TIER_INFO = {
  artist_basic:   { name: 'Artist Basic',   monthly: 25,  side: 'artist' },
  artist_pro:     { name: 'Artist Pro',     monthly: 40,  side: 'artist' },
  promoter_basic: { name: 'Promoter Basic', monthly: 79,  side: 'promoter' },
  promoter_pro:   { name: 'Promoter Pro',   monthly: 149, side: 'promoter' },
};
