import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RoleProvider, useMyProfile } from '@/lib/RoleContext';
import SignIn from '@/pages/SignIn';
import Onboarding from '@/pages/Onboarding';
import Terms from '@/pages/Terms';
import ErrorBoundary from '@/lib/ErrorBoundary';
import { Sentry } from '@/lib/sentry';

// Wraps Routes so Sentry traces report by route pattern (e.g.
// "/ContractDetail") instead of raw URLs with query strings.
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
    <div className="w-8 h-8 border-4 border-zinc-800 border-t-violet-500 rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const { myProfile, isLoadingProfile } = useMyProfile();

  if (isLoadingAuth) {
    return (
      <SentryRoutes>
        <Route path="/Terms" element={<Terms />} />
        <Route path="*" element={<Spinner />} />
      </SentryRoutes>
    );
  }
  if (!isAuthenticated) {
    return (
      <SentryRoutes>
        <Route path="/Terms" element={<Terms />} />
        <Route path="*" element={<SignIn />} />
      </SentryRoutes>
    );
  }
  if (isLoadingProfile) return <Spinner />;

  // New users land in onboarding until they pick a side (artist/promoter)
  // and a tier. The onboarding completes both writes before letting the
  // app render.
  if (myProfile && !myProfile.user_side) return <Onboarding />;

  return (
    <Routes>
      <Route path="/Terms" element={<Terms />} />
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {/* If an authenticated user lands on /SignIn (e.g. via the legacy
          redirectToLogin shim or after a sign-in completes), bounce them home. */}
      <Route path="/SignIn" element={<Navigate to="/" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <RoleProvider>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </RoleProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
