import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMyProfile } from "@/lib/RoleContext";
import {
  Users,
  Search,
  User,
  UserPlus,
  Check,
  X,
  Clock,
  Link2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorCard } from "@/lib/QueryState";

export default function Network() {
  const { myProfile } = useMyProfile();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // PublicProfile is a view that exposes only the non-PII columns.
  // Email/phone/address are NOT returned here; counterparty contact info
  // is only readable once an accepted connection exists.
  const profilesQuery = useQuery({
    queryKey: ["public_profiles"],
    queryFn: () => base44.entities.PublicProfile.list(),
  });

  const connectionsQuery = useQuery({
    queryKey: ["connections"],
    queryFn: () => base44.entities.Connection.list(),
  });

  const profiles = profilesQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];
  const isLoading = profilesQuery.isLoading || connectionsQuery.isLoading;
  const isError = profilesQuery.isError || connectionsQuery.isError;
  const isFetching = profilesQuery.isFetching || connectionsQuery.isFetching;
  const refetchAll = () => {
    profilesQuery.refetch();
    connectionsQuery.refetch();
  };

  const sendRequest = useMutation({
    mutationFn: (recipientProfile) =>
      base44.entities.Connection.create({
        requester_profile_id: myProfile.id,
        recipient_profile_id: recipientProfile.id,
        status: "pending",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  const profileName = (profileId) =>
    profiles.find((p) => p.id === profileId)?.name ?? "Unknown";

  const updateConnection = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.Connection.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  const removeConnection = useMutation({
    mutationFn: (id) => base44.entities.Connection.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  const getConnectionWith = (profileId) => {
    if (!myProfile) return null;
    return connections.find(
      (c) =>
        (c.requester_profile_id === myProfile.id && c.recipient_profile_id === profileId) ||
        (c.recipient_profile_id === myProfile.id && c.requester_profile_id === profileId)
    );
  };

  const pendingIncoming = connections.filter(
    (c) => myProfile && c.recipient_profile_id === myProfile.id && c.status === "pending"
  );

  const otherProfiles = profiles.filter((p) => {
    if (p.id === myProfile?.id) return false;
    const q = search.trim().toLowerCase().replace(/^@/, '');
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  });

  const acceptedConnections = connections.filter(
    (c) =>
      myProfile &&
      c.status === "accepted" &&
      (c.requester_profile_id === myProfile.id || c.recipient_profile_id === myProfile.id)
  );

  const getConnectedProfile = (conn) => {
    if (!myProfile) return null;
    const otherId =
      conn.requester_profile_id === myProfile.id
        ? conn.recipient_profile_id
        : conn.requester_profile_id;
    return profiles.find((p) => p.id === otherId);
  };

  if (!myProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-400">No profile found. Create one in Profiles first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Network</h1>
          <p className="mt-1 text-zinc-400">
            Connect with others to speed up contract creation
          </p>
        </motion.div>

        {isLoading && <NetworkBodySkeleton />}

        {!isLoading && isError && (
          <QueryErrorCard onRetry={refetchAll} isRetrying={isFetching} />
        )}

        {!isLoading && !isError && (
        <>
        {/* Pending incoming requests */}
        <AnimatePresence>
          {pendingIncoming.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5"
            >
              <h2 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending Requests ({pendingIncoming.length})
              </h2>
              <div className="space-y-3">
                {pendingIncoming.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{profileName(conn.requester_profile_id)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateConnection.mutate({ id: conn.id, status: "accepted" })} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3 gap-1">
                        <Check className="w-3 h-3" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateConnection.mutate({ id: conn.id, status: "declined" })} className="text-zinc-400 hover:text-white h-8 px-3 gap-1">
                        <X className="w-3 h-3" /> Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* My Connections */}
        {acceptedConnections.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-violet-400" />
              My Connections ({acceptedConnections.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {acceptedConnections.map((conn) => {
                const p = getConnectedProfile(conn);
                if (!p) return null;
                return (
                  <div key={conn.id} className="flex items-center justify-between rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        <p className="text-xs text-zinc-500">
                          {p.username ? `@${p.username}` : p.city}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConnection.mutate(conn.id)}
                      aria-label={`Remove connection: ${conn.other_profile?.name ?? 'user'}`}
                      className="text-zinc-600 hover:text-rose-400 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Discover */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-semibold text-white mb-3">Discover Profiles</h2>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Search by @username, name, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-violet-500 rounded-xl"
            />
          </div>

          {otherProfiles.length === 0 ? (
            <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-10 text-center">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No profiles found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {otherProfiles.map((p) => {
                const conn = getConnectionWith(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        {(p.username || p.city) && (
                          <p className="text-xs text-zinc-500">
                            {p.username ? `@${p.username}` : p.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      {!conn && (
                        <Button
                          size="sm"
                          onClick={() => sendRequest.mutate(p)}
                          className="bg-violet-600 hover:bg-violet-700 h-8 px-3 gap-1"
                        >
                          <UserPlus className="w-3 h-3" /> Connect
                        </Button>
                      )}
                      {conn?.status === "pending" && conn.requester_profile_id === myProfile.id && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      )}
                      {conn?.status === "pending" && conn.recipient_profile_id === myProfile.id && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateConnection.mutate({ id: conn.id, status: "accepted" })} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3">
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => updateConnection.mutate({ id: conn.id, status: "declined" })} className="text-zinc-400 h-8 px-3">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      {conn?.status === "accepted" && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <Check className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                      )}
                      {conn?.status === "declined" && (
                        <Badge className="bg-zinc-700 text-zinc-400">Declined</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
        </>
        )}
      </div>
    </div>
  );
}

function NetworkBodySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-40 bg-zinc-800" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 bg-zinc-800 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-zinc-800" />
                <Skeleton className="h-3 w-24 bg-zinc-800" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 bg-zinc-800 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
