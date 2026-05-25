import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('getSession failed:', err);
        setAuthError(err);
      })
      .finally(() => setIsLoadingAuth(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  const logout = async () => {
    // No URL redirect — once user state is null, the unauthenticated
    // branch in <AuthenticatedApp> renders <SignIn /> automatically.
    // Full-page redirects to /SignIn raced against session restoration
    // and could land an authenticated user back on the dashboard.
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('signOut failed:', err);
    }
    setUser(null);
    setSession(null);
  };

  const navigateToLogin = () => {
    // Same reasoning as logout — let React state drive the UI.
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false, // legacy field; nothing to load
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
