import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useMyProfile } from '@/lib/RoleContext';

// Single source of truth for "can this user perform write actions
// gated behind a paying subscription?". Mirrors the DB trigger in
// 0014_paywall_contract_insert.sql — keep the allow-list in sync.

const ACCESS_STATUSES = new Set(['trialing', 'active', 'past_due']);

export function useSubscriptionAccess() {
  const { myProfile, isLoadingProfile } = useMyProfile();

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['my-subscription', myProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('tier, status, cancel_at_period_end, trial_ends_at, current_period_end')
        .eq('profile_id', myProfile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!myProfile?.id,
  });

  const isLoading = isLoadingProfile || subLoading;
  const status = subscription?.status ?? null;
  const tier = subscription?.tier ?? null;
  const canCreateContracts = status ? ACCESS_STATUSES.has(status) : false;
  // Pro features only for paying-or-trialing Pro subscribers. A Pro
  // user whose status flipped to canceled loses Pro UI immediately,
  // matching how the paywall treats contract creation.
  const isPro = canCreateContracts && !!tier && tier.endsWith('_pro');

  // Guest: completed onboarding (picked a side) but skipped the paid
  // tier — they can sign contracts on contracts the paid party created,
  // but cannot initiate.
  const isGuest = !isLoading && !!myProfile?.user_side && !subscription;

  // Surface the most actionable reason; the paywall screen branches
  // on this to write copy that matches the user's specific situation.
  let blockReason = null;
  if (!isLoading) {
    if (!subscription) blockReason = 'guest';
    else if (status === 'canceled') blockReason = 'canceled';
    else if (status === 'unpaid') blockReason = 'unpaid';
    else if (status === 'incomplete' || status === 'incomplete_expired') {
      blockReason = 'incomplete';
    }
  }

  return {
    isLoading,
    canCreateContracts,
    status,
    tier,
    isPro,
    isGuest,
    blockReason,
    subscription,
  };
}
