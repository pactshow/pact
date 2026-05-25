import { useMyProfile } from '@/lib/RoleContext';

// "Events" for promoters, "Tours" for artists. Same DB feature
// underneath; the label is purely cosmetic. Centralized so we don't
// have if/else side-switches scattered through page copy.
export function useFolderLabel() {
  const { myProfile } = useMyProfile();
  if (myProfile?.user_side === 'artist') {
    return { singular: 'Tour', plural: 'Tours', lowerSingular: 'tour' };
  }
  return { singular: 'Event', plural: 'Events', lowerSingular: 'event' };
}
