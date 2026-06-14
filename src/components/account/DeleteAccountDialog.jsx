import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/lib/supabase";

export default function DeleteAccountDialog({ open, onOpenChange, username }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const challenge = username || "delete my account";
  const challengeLabel = username ? `Type your username (${username}) to confirm` : 'Type "delete my account" to confirm';

  const reset = () => {
    setStep(1);
    setConfirmText("");
    setError(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const matches = confirmText.trim().toLowerCase() === challenge.toLowerCase();

  const handleDelete = async () => {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("deleteAccount", {
        confirm_username: confirmText.trim().toLowerCase(),
      });
      if (!res?.ok) {
        throw new Error(res?.error || "Failed to delete account");
      }
      // Auth user is gone server-side; client-side signOut clears local session.
      await supabase.auth.signOut();
      navigate("/SignIn?deleted=1", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" aria-hidden="true" />
                Delete your account?
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2">
                This is permanent and immediate. There's no 30-day recovery window.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm pt-1">
              <div>
                <p className="text-zinc-300 font-medium mb-1.5">Permanently deleted</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                  <li>Your profile, login, and personal data</li>
                  <li>Draft contracts you haven't sent</li>
                  <li>Folders, custom clauses, and templates</li>
                  <li>Notifications and connection requests</li>
                </ul>
              </div>

              <div>
                <p className="text-zinc-300 font-medium mb-1.5">Preserved for the other party</p>
                <ul className="list-disc list-inside text-zinc-400 space-y-0.5">
                  <li>Signed contracts with your signing-time name + signature</li>
                  <li>Payment records (required by financial regulation)</li>
                </ul>
                <p className="text-xs text-zinc-500 mt-1.5">
                  On those contracts, your live profile link is removed — the other party will see
                  "Account deleted."
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Keep my account
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="h-10 bg-rose-600 hover:bg-rose-500 text-white"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" aria-hidden="true" />
                Final confirmation
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2">
                {challengeLabel}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm" className="text-zinc-300">
                  Confirmation
                </Label>
                <Input
                  id="delete-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={challenge}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={submitting}
                  autoFocus
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="h-10 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Back
              </Button>
              <Button
                onClick={handleDelete}
                disabled={!matches || submitting}
                className="h-10 bg-rose-600 hover:bg-rose-500 text-white gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Deleting…
                  </>
                ) : (
                  "Delete account permanently"
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
