import { useEffect, useState } from 'react';
import { useMyProfile } from '@/lib/RoleContext';
import { useSubscriptionAccess } from '@/lib/useSubscriptionAccess';
import BankSetupFlow from './BankSetupFlow';

// Auto-prompts Guest artists to set up Stripe Connect (KYC + payout
// bank) so they can actually receive money when they sign a contract
// someone sent them. Pops once per session; dismissible. Promoter
// Guests link a bank per-payment via Financial Connections inline,
// so they don't need this prompt.
export default function GuestArtistBankPrompt() {
  const { myProfile } = useMyProfile();
  const { isGuest, isLoading } = useSubscriptionAccess();

  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  const needsConnect =
    !isLoading
    && isGuest
    && myProfile?.user_side === 'artist'
    && !myProfile?.stripe_onboarding_complete;

  useEffect(() => {
    if (needsConnect && !shown) {
      setOpen(true);
      setShown(true);
    }
  }, [needsConnect, shown]);

  if (!myProfile?.id) return null;

  return (
    <BankSetupFlow
      profileId={myProfile.id}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
