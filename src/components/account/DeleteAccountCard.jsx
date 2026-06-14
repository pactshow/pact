import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import DeleteAccountDialog from "./DeleteAccountDialog";

export default function DeleteAccountCard({ profile }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["can-delete-account", profile?.id],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc("can_delete_account");
      if (rpcError) throw rpcError;
      return data;
    },
    enabled: !!profile?.id,
  });

  const blockers = data?.blockers ?? [];
  const canDelete = data?.can_delete === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-900 border border-rose-900/40 rounded-2xl p-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-rose-300" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Delete account</h2>
          <p className="text-sm text-zinc-400 mt-0.5">
            Permanently delete your Pact account and personal data. Your signed contracts will be
            preserved for the other party with your signing-time name intact, but your live profile,
            folders, custom clauses, and login will be removed.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking your account…
        </div>
      ) : error ? (
        <div role="alert" className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          Could not check eligibility. {error.message ?? "Please try again."}
        </div>
      ) : !canDelete ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Resolve the following before you can delete your account:
          </p>
          <ul className="space-y-2">
            {blockers.map((b) => (
              <li
                key={b.code}
                className="text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
              >
                {b.message}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              {isRefetching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" aria-hidden="true" />
                  Re-checking…
                </>
              ) : (
                "Re-check"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Your account is eligible for deletion. This action is permanent.
          </p>
          <div className="flex justify-end">
            <Button
              onClick={() => setConfirmOpen(true)}
              className="h-10 bg-rose-600 hover:bg-rose-500 text-white gap-2"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </div>
      )}

      <DeleteAccountDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        username={profile?.username}
      />
    </motion.div>
  );
}
