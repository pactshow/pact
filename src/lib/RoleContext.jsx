import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

// One user = one profile. This context loads that single profile and
// exposes it as `myProfile`. The legacy `role` / `ROLES` / activeProfile
// API is gone — see usage sites that used to check `role.id` etc.
const ProfileContext = createContext(null);

export function RoleProvider({ children }) {
  const { isAuthenticated, user } = useAuth();

  const { data: myProfile = null, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const rows = await base44.entities.Profile.filter({ user_id: user.id });
      return rows[0] || null;
    },
    enabled: isAuthenticated && !!user?.id,
  });

  return (
    <ProfileContext.Provider value={{ myProfile, isLoadingProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useMyProfile() {
  return useContext(ProfileContext);
}

// Back-compat alias during the migration — callers that still import
// `useRole` keep working and just receive { myProfile, isLoadingProfile }.
export const useRole = useMyProfile;
