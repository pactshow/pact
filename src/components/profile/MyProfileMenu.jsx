import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { UserCircle, LogOut, User, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";
import { useSubscriptionAccess } from "@/lib/useSubscriptionAccess";
import { TIER_INFO } from "@/components/account/tierInfo";

export default function MyProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tier, isPro, isGuest, isLoading } = useSubscriptionAccess();

  if (!user) return null;

  const tierLabel = tier ? TIER_INFO[tier]?.name : (isGuest ? "Guest" : null);
  const showUpgrade = !isLoading && !isPro;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Account"
        >
          <UserCircle className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-900 border-zinc-800 text-white min-w-60"
      >
        <DropdownMenuLabel className="font-normal py-2">
          <div className="text-zinc-300 truncate">{user.email}</div>
          {tierLabel && (
            <div className="mt-1 flex items-center gap-1.5">
              {isPro && <Sparkles className="w-3 h-3 text-violet-400" />}
              <span className={`text-xs ${isPro ? 'text-violet-300' : 'text-zinc-500'}`}>
                {tierLabel}
              </span>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={() => navigate(createPageUrl("Profiles"))}
          className="gap-2 cursor-pointer focus:bg-zinc-800"
        >
          <User className="w-4 h-4" />
          My Profile
        </DropdownMenuItem>
        {showUpgrade && (
          <DropdownMenuItem
            onClick={() => navigate(isGuest ? `${createPageUrl("Onboarding")}?upgrade=1` : createPageUrl("Profiles"))}
            className="gap-2 cursor-pointer focus:bg-zinc-800 text-violet-300 focus:text-violet-200"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade to Pro
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={() => logout()}
          className="gap-2 cursor-pointer focus:bg-zinc-800 text-red-400 focus:text-red-400"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
