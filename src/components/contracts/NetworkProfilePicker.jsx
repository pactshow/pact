import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useMyProfile } from "@/lib/RoleContext";
import { Button } from "@/components/ui/button";
import { User, Zap, MapPin } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

export default function NetworkProfilePicker({ onSelect, label = "Auto-fill from Network" }) {
  const { myProfile } = useMyProfile();
  const [open, setOpen] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: () => base44.entities.Profile.list(),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => base44.entities.Connection.list(),
  });

  if (!myProfile) return null;

  const connectedProfileIds = connections
    .filter(
      (c) =>
        c.status === "accepted" &&
        (c.requester_profile_id === myProfile.id || c.recipient_profile_id === myProfile.id)
    )
    .map((c) =>
      c.requester_profile_id === myProfile.id ? c.recipient_profile_id : c.requester_profile_id
    );

  const connectedProfiles = profiles.filter(
    (p) => connectedProfileIds.includes(p.id) && p.id !== myProfile.id
  );

  if (connectedProfiles.length === 0) return null;

  const handlePick = (profile) => {
    onSelect?.(profile);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/30 gap-1.5 rounded-lg h-8 px-3"
        >
          <Zap className="w-3.5 h-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-zinc-900 border-zinc-700 p-3" align="start">
        <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wide">Your Connections</p>
        <div className="space-y-2">
          {connectedProfiles.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePick(p)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="p-1.5 rounded-md bg-violet-500/10">
                <User className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{p.name}</p>
                {p.city && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />{p.city}
                  </p>
                )}
              </div>
              <span className="ml-auto text-xs text-violet-400 shrink-0">Fill →</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
