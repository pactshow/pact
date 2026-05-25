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
    { name: foldersLabel, page: "Folders", icon: FolderOpen },
    { name: "Templates", page: "Templates", icon: Sparkles },
    { name: "My Clauses", page: "MyClauses", icon: BookOpen },
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
  const { isGuest } = useSubscriptionAccess();
  const isAdmin = Boolean(myProfile?.is_admin);
  const navItems = buildNavItems(myProfile?.user_side, isGuest);

  return (
    <div className="min-h-screen bg-zinc-950">
      <GuestArtistBankPrompt />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-900/50 border-r border-zinc-800 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <img 
              src="https://media.base44.com/images/public/6982b525bbf1aa39d2ad1474/07af62a33_B4FDD5C5-788C-4B9B-8DFD-36B7FACBB6CF.png" 
              alt="Pact." 
              className="h-10 w-auto rounded-lg bg-white px-2 py-1"
            />
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
                      className={`group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-violet-600 text-white"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
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
                            className={`group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
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
          className="text-zinc-400 hover:text-white"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-3 ml-auto">
          <MyProfileMenu />
          <NotificationBell />
          <img
            src="https://media.base44.com/images/public/6982b525bbf1aa39d2ad1474/07af62a33_B4FDD5C5-788C-4B9B-8DFD-36B7FACBB6CF.png"
            alt="Pact."
            className="h-8 w-auto rounded-lg bg-white px-2 py-1"
          />
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center">
                  <img 
                    src="https://media.base44.com/images/public/6982b525bbf1aa39d2ad1474/07af62a33_B4FDD5C5-788C-4B9B-8DFD-36B7FACBB6CF.png" 
                    alt="Pact." 
                    className="h-8 w-auto rounded-lg bg-white px-2 py-1"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
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
                          className={`group flex gap-x-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                            isActive
                              ? "bg-violet-600 text-white"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                          }`}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.name}
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
                                className={`group flex gap-x-3 rounded-xl px-3 py-3 text-sm font-medium transition-all ${
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
      <main className="lg:pl-64">
        {children}
      </main>
    </div>
  );
}