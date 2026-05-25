import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { base44 } from "@/api/base44Client";
import { useMyProfile } from "@/lib/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Loader2, ShieldCheck, Save, DollarSign, Search } from "lucide-react";

const PACT_FEE_BPS = 200;

export default function AdminBilling() {
  const { myProfile, isLoadingProfile } = useMyProfile();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-billing'],
    queryFn: async () => {
      // Pull subs + the profile they belong to. Admin RLS lets us see
      // every row; the embedded profiles join works because subscriptions
      // has an FK to profiles.
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, profile_id, tier, status, cancel_at_period_end,
          current_period_end, trial_ends_at, custom_fee_bps,
          custom_monthly_price_id, stripe_subscription_id,
          profiles ( id, name, email, user_side, is_admin )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(myProfile?.is_admin),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, custom_fee_bps, custom_monthly_price_id }) => {
      // Edge fn handles both the DB write AND the Stripe price swap so
      // the next bill actually uses the new amount.
      const res = await base44.functions.invoke('adminSetCustomBilling', {
        subscription_id: id,
        custom_fee_bps: custom_fee_bps,
        custom_monthly_price_id: custom_monthly_price_id || null,
      });
      if (!res?.ok) throw new Error(res?.error || 'Failed to save');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-billing'] });
      setEditing(null);
    },
  });

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }
  if (!myProfile?.is_admin) return <Navigate to="/" replace />;

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? rows
    : rows.filter(r =>
        (r.profiles?.email ?? '').toLowerCase().includes(q)
        || (r.profiles?.name ?? '').toLowerCase().includes(q)
        || (r.tier ?? '').includes(q)
      );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-amber-300 text-xs flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin Mode — changes here override Pact's default billing on a per-account basis
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-violet-400" />
            Custom Billing
          </h1>
          <p className="mt-1 text-zinc-400">
            Override default fee + monthly price per subscription. Use for negotiated enterprise deals (e.g. festivals).
          </p>
        </motion.div>

        <div className="mb-4 relative max-w-sm">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, or tier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">
            {q ? 'No matches.' : 'No subscriptions yet.'}
          </p>
        ) : (
          <div className="rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/70 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Account</th>
                  <th className="text-left px-4 py-3 font-medium">Tier · Status</th>
                  <th className="text-right px-4 py-3 font-medium">Fee rate</th>
                  <th className="text-left px-4 py-3 font-medium">Custom Stripe Price</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map(r => {
                  const usingCustomFee = r.custom_fee_bps != null;
                  const feeBps = usingCustomFee ? r.custom_fee_bps : PACT_FEE_BPS;
                  return (
                    <tr key={r.id} className="hover:bg-zinc-900/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{r.profiles?.name || '(no name)'}</div>
                        <div className="text-xs text-zinc-500">{r.profiles?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-300">{r.tier}</div>
                        <div className="text-xs text-zinc-500">{r.status}{r.cancel_at_period_end ? ' · cancelling' : ''}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`font-mono ${usingCustomFee ? 'text-violet-300' : 'text-zinc-200'}`}>
                          {(feeBps / 100).toFixed(2)}%
                        </div>
                        {usingCustomFee && (
                          <Badge className="bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs mt-1">
                            Custom
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-zinc-400 font-mono">
                          {r.custom_monthly_price_id || <span className="text-zinc-600">— (default)</span>}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setEditing(r)}
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BillingEditor
        sub={editing}
        onClose={() => setEditing(null)}
        onSave={(payload) => saveMutation.mutate(payload)}
        saving={saveMutation.isPending}
        error={saveMutation.error?.message}
      />
    </div>
  );
}

function BillingEditor({ sub, onClose, onSave, saving, error }) {
  const [feePercent, setFeePercent] = useState("");
  const [priceId, setPriceId] = useState("");
  const [draft, setDraft] = useState(null);

  // Initialize when dialog opens for a new sub
  if (sub && draft?.id !== sub.id) {
    setDraft({ id: sub.id });
    setFeePercent(sub.custom_fee_bps != null ? (sub.custom_fee_bps / 100).toString() : "");
    setPriceId(sub.custom_monthly_price_id ?? "");
  }
  if (!sub && draft !== null) {
    setDraft(null);
    setFeePercent("");
    setPriceId("");
  }
  if (!sub || !draft) return null;

  const parsedFee = feePercent.trim() === "" ? null : Math.round(parseFloat(feePercent) * 100);
  const feeInvalid = feePercent.trim() !== "" && (
    !Number.isFinite(parsedFee) || parsedFee < 0 || parsedFee > 10000
  );

  const submit = () => {
    if (feeInvalid) return;
    onSave({
      id: sub.id,
      custom_fee_bps: parsedFee,
      custom_monthly_price_id: priceId.trim() || null,
    });
  };

  return (
    <Dialog open={!!sub} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Custom billing for {sub.profiles?.name || sub.profiles?.email || sub.profile_id}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Leave a field blank to revert to the platform default.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-zinc-300 text-sm">Custom fee rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              placeholder={`${(PACT_FEE_BPS / 100).toFixed(2)} (default)`}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Applied to every contract this account creates. {parsedFee != null && !feeInvalid && (
                <span>= <span className="font-mono text-zinc-300">{parsedFee} bps</span></span>
              )}
            </p>
            {feeInvalid && (
              <p className="text-xs text-rose-400 mt-1">Must be between 0 and 100.</p>
            )}
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Custom Stripe Price ID (optional)</Label>
            <Input
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
              placeholder="price_1ABcd..."
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">
              When you save, the actual Stripe subscription is swapped to this price with proration. Leave blank to keep the default tier price.
            </p>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || feeInvalid}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
