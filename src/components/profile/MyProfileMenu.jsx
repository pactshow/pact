import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { UserCircle, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";

export default function MyProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  if (!user) return null;

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
        className="bg-zinc-900 border-zinc-800 text-white min-w-56"
      >
        <DropdownMenuLabel className="text-zinc-400 font-normal truncate">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={() => navigate(createPageUrl("Profiles"))}
          className="gap-2 cursor-pointer focus:bg-zinc-800"
        >
          <User className="w-4 h-4" />
          My Profile
        </DropdownMenuItem>
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
