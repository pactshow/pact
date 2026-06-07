import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import {
  Loader2,
  Save,
  Landmark,
  CheckCircle2,
} from "lucide-react";
import ConnectOnboardingDialog from "@/components/payments/ConnectOnboardingDialog";
import SubscriptionCard from "@/components/account/SubscriptionCard";
import useFormDraft from "@/lib/useFormDraft";
import DraftRestoredBanner from "@/components/DraftRestoredBanner";

export default function Profiles() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const all = await base44.entities.Profile.filter({ user_id: user.id });
      return all[0] || null;
    },
    enabled: !!user?.id,
  });

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return <ProfilesContent key={profile.id} profile={profile} />;
}

function ProfilesContent({ profile }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);

  const [formData, setFormData, { restoredFromDraft, clearDraft, discardDraft }] =
    useFormDraft(`profile:${profile.id}`, profile);

  const updateProfile = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Profile.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const handleSave = async () => {
    if (!profile?.id || !formData) return;
    setSaving(true);
    const { id, user_id, created_at, updated_at, stripe_customer_id,
      stripe_connect_account_id, stripe_onboarding_complete,
      ...payload } = formData;
    try {
      await updateProfile.mutateAsync({ id: profile.id, data: payload });
      clearDraft();
    } catch (err) {
      console.error('Profile save failed:', err);
      const msg = err.message || 'Unknown error';
      if (/duplicate key|already exists/i.test(msg) && /username/i.test(msg)) {
        alert('That username is already taken. Try another.');
      } else if (/profiles_username_format/i.test(msg)) {
        alert('Username must be 3-20 characters: lowercase letters, numbers, or underscore.');
      } else {
        alert(`Could not save profile: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConnectStripe = () => {
    if (!profile?.id) return;
    setConnectDialogOpen(true);
  };

  const handleConnectComplete = async () => {
    setConnectLoading(true);
    try {
      await base44.functions.invoke('refreshConnectStatus', { profile_id: profile.id });
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (err) {
      console.error('Refresh status error:', err);
    } finally {
      setConnectLoading(false);
    }
  };

  const handleRefreshConnectStatus = async () => {
    if (!profile?.id) return;
    setConnectLoading(true);
    try {
      await base44.functions.invoke('refreshConnectStatus', { profile_id: profile.id });
      await queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (err) {
      console.error('Refresh status error:', err);
      alert('Failed to refresh Stripe status.');
    } finally {
      setConnectLoading(false);
    }
  };

  const onboardingComplete = !!formData.stripe_onboarding_complete;
  const hasConnectAccount = !!formData.stripe_connect_account_id;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My Profile</h1>
          <p className="mt-1 text-zinc-400">
            This is how other people on Pact. will see you when you send or receive contracts.
          </p>
        </motion.div>

        {restoredFromDraft && (
          <DraftRestoredBanner onDiscard={() => discardDraft(profile)} />
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-zinc-300">Name</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name or business name"
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-zinc-300">
                Username <span className="text-zinc-500 font-normal">(optional)</span>
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">@</span>
                <Input
                  value={formData.username || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
                    })
                  }
                  maxLength={20}
                  placeholder="preston"
                  autoComplete="username"
                  className="pl-7 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                3-20 chars: lowercase letters, numbers, underscore. Used for @-mentions on the Network page.
              </p>
            </div>
            <div>
              <Label className="text-zinc-300">Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">Phone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">Address</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-zinc-300">City</Label>
              <Input
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">State</Label>
              <Input
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div>
              <Label className="text-zinc-300">ZIP</Label>
              <Input
                value={formData.zip_code || ''}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="mt-1.5 bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-zinc-300">Website</Label>
            <Input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
              pattern="https?://.*"
              maxLength={500}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Bio / Description</Label>
            <Textarea
              value={formData.bio || ''}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Short description..."
              rows={3}
              maxLength={2000}
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div>
            <Label className="text-zinc-300">Standard Rate ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.standard_rate || ''}
              onChange={(e) => setFormData({
                ...formData,
                standard_rate: parseFloat(e.target.value) || null,
              })}
              placeholder="0.00"
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div>
              <Label className="text-zinc-300">Payouts (Stripe Connect)</Label>
              <p className="text-xs text-zinc-500 mt-1">
                {onboardingComplete
                  ? 'Bank account connected and verified. You can receive payouts.'
                  : 'Connect a bank account through Stripe to receive payouts. Stripe will collect your bank details and tax information securely.'}
              </p>
            </div>

            {!onboardingComplete && !hasConnectAccount && (
              <>
                <div>
                  <Label className="text-zinc-300 text-sm">Receive payouts as</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, entity_type: 'individual' })}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        (formData.entity_type ?? 'individual') === 'individual'
                          ? 'border-violet-500 bg-violet-500/10 text-white'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, entity_type: 'business' })}
                      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                        formData.entity_type === 'business'
                          ? 'border-violet-500 bg-violet-500/10 text-white'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      Business / LLC
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    Choose Business if your bank account is in your LLC's name. You'll provide your EIN to Stripe in the next step.
                  </p>
                </div>

                {formData.entity_type === 'business' && (
                  <div>
                    <Label className="text-zinc-300 text-sm">Legal business name</Label>
                    <Input
                      value={formData.business_name || ''}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="e.g. 2nd Wind Music LLC"
                      className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Exactly as registered with your state. Must match the name on your bank account.
                    </p>
                  </div>
                )}
              </>
            )}
            {onboardingComplete ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Connected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshConnectStatus}
                  disabled={connectLoading}
                  className="ml-auto text-zinc-400 hover:text-white"
                >
                  {connectLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Refresh status'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleConnectStripe}
                  disabled={connectLoading}
                  className="bg-violet-600 hover:bg-violet-700 gap-2 rounded-xl"
                >
                  {connectLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Landmark className="w-4 h-4" />}
                  {hasConnectAccount ? 'Continue onboarding' : 'Connect bank account'}
                </Button>
                {hasConnectAccount && (
                  <Button
                    variant="outline"
                    onClick={handleRefreshConnectStatus}
                    disabled={connectLoading}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
                  >
                    Refresh status
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.email}
              className="bg-violet-600 hover:bg-violet-700 gap-2 rounded-xl h-11 px-6"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </Button>
          </div>
        </motion.div>

        <div className="mt-6">
          <SubscriptionCard profile={profile} />
        </div>
      </div>

      <ConnectOnboardingDialog
        profileId={profile?.id}
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        onComplete={handleConnectComplete}
      />
    </div>
  );
}
