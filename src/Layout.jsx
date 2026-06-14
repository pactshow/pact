import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  Sparkles,
  Menu,
  X,
  Building2,
  Network,
  BookOpen,
  FolderOpen,
  FileSpreadsheet
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/components/notifications/NotificationBell";
import MyProfileMenu from "@/components/profile/MyProfileMenu";
import GuestArtistBankPrompt from "@/components/payments/GuestArtistBankPrompt";
import AgeGate from "@/components/AgeGate";
import { useMyProfile } from "@/lib/RoleContext";
import { useSubscriptionAccess } from "@/lib/useSubscriptionAccess";

// Folders nav item label depends on the user's side: artists see
// "Tours", promoters see "Events". Same route + page underneath.
// Tax Reports is promoter-only in nav (artists who occasionally pay
// can still navigate to /TaxReports directly — the page itself is
// Pro-gated, not side-gated).
// Guests get a stripped nav — only the pages they can actually use
// (Dashboard, Contracts they're signing, Payments).
function buildNavItems(userSide, isGuest) {
  if (isGuest) {
    return [
      { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
      { name: "Contracts", page: "Contracts", icon: FileText },
      { name: "Payments", page: "Payments", icon: DollarSign },
    ];
  }
  const foldersLabel = userSide === 'artist' ? 'Tours' : 'Events';
  const items = [
    { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
    { name: "Contracts", page: "Contracts", icon: FileText },
    { name: foldersLabel, page: "Folders", icon: FolderOpen, pro: true },
    { name: "Templates", page: "Templates", icon: Sparkles, pro: true },
    { name: "My Clauses", page: "MyClauses", icon: BookOpen, pro: true },
    { name: "Payments", page: "Payments", icon: DollarSign },
    { name: "Network", page: "Network", icon: Network },
    { name: "Payment Records", page: "VenuePaymentRecords", icon: Building2 },
  ];
  if (userSide === 'promoter') {
    items.push({ name: "Tax Reports", page: "TaxReports", icon: FileSpreadsheet });
  }
  return items;
}

const adminNavItems = [
  { name: "Clause Library", page: "AdminClauses", icon: BookOpen },
  { name: "Custom Billing", page: "AdminBilling", icon: DollarSign },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { myProfile } = useMyProfile();
  const { isGuest, isPro } = useSubscriptionAccess();
  const isAdmin = Boolean(myProfile?.is_admin);
  const navItems = buildNavItems(myProfile?.user_side, isGuest);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Skip-to-content for keyboard / screen-reader users. Hidden
          until focused so it doesn't visually clutter the layout. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        Skip to main content
      </a>
      <AgeGate />
      <GuestArtistBankPrompt />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-900/50 border-r border-zinc-800 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <span className="text-2xl font-bold tracking-tight text-white">Pact.</span>
          </div>
          
          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-1">
              {navItems.map((item) => {
                const isActive = currentPageName === item.page;
                return (
                  <li key={item.name}>
                    <Link
                      to={createPageUrl(item.page)}
                      aria-current={isActive ? "page" : undefined}
                      className={`group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                        isActive
                          ? "bg-violet-600 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
                      {item.pro && !isPro && (
                        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                          Pro
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {isAdmin && (
                <li className="mt-6">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-amber-400/70 mb-1">Admin</p>
                  <ul className="space-y-1">
                    {adminNavItems.map((item) => {
                      const isActive = currentPageName === item.page;
                      return (
                        <li key={item.name}>
                          <Link
                            to={createPageUrl(item.page)}
                            aria-current={isActive ? "page" : undefined}
                            className={`group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                              isActive
                                ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                : "text-zinc-400 hover:text-amber-200 hover:bg-amber-500/10"
                            }`}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Desktop Top-Right Icons */}
      <div className="hidden lg:flex fixed top-0 right-0 z-50 items-center gap-1 h-16 px-4">
        <MyProfileMenu />
        <NotificationBell />
      </div>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-4 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          className="text-zinc-400 hover:text-white"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-3 ml-auto">
          <MyProfileMenu />
          <NotificationBell />
          <span className="text-lg font-bold tracking-tight text-white">Pact.</span>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              id="mobile-nav-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center">
                  <span className="text-xl font-bold tracking-tight text-white">Pact.</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation menu"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
              
              <nav className="px-4 mt-4">
                <ul className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = currentPageName === item.page;
                    return (
                      <li key={item.name}>
                        <Link
                          to={createPageUrl(item.page)}
                          onClick={() => setMobileMenuOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={`group flex items-center gap-x-3 rounded-xl px-3 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                            isActive
                              ? "bg-violet-600 text-white"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          }`}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.name}
                          {item.pro && !isPro && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                              Pro
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                  {isAdmin && (
                    <li className="mt-6">
                      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-amber-400/70 mb-1">Admin</p>
                      <ul className="space-y-1">
                        {adminNavItems.map((item) => {
                          const isActive = currentPageName === item.page;
                          return (
                            <li key={item.name}>
                              <Link
                                to={createPageUrl(item.page)}
                                onClick={() => setMobileMenuOpen(false)}
                                aria-current={isActive ? "page" : undefined}
                                className={`group flex gap-x-3 rounded-xl px-3 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                                  isActive
                                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                                    : "text-zinc-400 hover:text-amber-200 hover:bg-amber-500/10"
                                }`}
                              >
                                <item.icon className="h-5 w-5 shrink-0" />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  )}
                </ul>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main id="main-content" className="lg:pl-64 flex-1">
        {children}
      </main>

      {/* Footer with legal links — present on every authenticated page */}
      <footer className="lg:pl-64 border-t border-zinc-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-zinc-400">
          <p>&copy; {new Date().getFullYear()} Pact.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
            <Link to="/Terms" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded">Terms</Link>
            <Link to="/Privacy" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded">Privacy</Link>
            <Link to="/Accessibility" className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded">Accessibility</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}