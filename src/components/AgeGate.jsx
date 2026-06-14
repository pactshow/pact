import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useMyProfile } from "@/lib/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogPortal, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Loader2 } from "lucide-react";
import { MIN_AGE_YEARS, maxDobForInput, ageOnDate } from "@/lib/age";

// Composed with DialogPrimitive.Content directly so we can:
//   * skip the default close (X) button — this gate is intentionally non-dismissible
//   * block Escape, outside-click, and any other dismiss attempt
// Radix still gives us focus trap, focus restoration, scroll lock, and
// aria-hidden on the rest of the page for free.
export default function AgeGate() {
  const { myProfile, isLoadingProfile } = useMyProfile();
  const queryClient = useQueryClient();
  const [dob, setDob] = useState("");
  const [error, setError] = useState(null);

  const needsGate = !isLoadingProfile && myProfile && !myProfile.date_of_birth;

  const confirm = useMutation({
    mutationFn: async (dobValue) => {
      const { error: rpcError } = await supabase.rpc("confirm_date_of_birth", {
        dob: dobValue,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (err) => {
      setError(err?.message || "Could not confirm your date of birth.");
    },
  });

  if (!needsGate) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      setError("Date of birth must be a valid date.");
      return;
    }
    const age = ageOnDate(dob);
    if (Number.isNaN(age) || age < MIN_AGE_YEARS) {
      setError(`You must be ${MIN_AGE_YEARS} or older to use Pact.`);
      return;
    }
    confirm.mutate(dob);
  };

  const onSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/SignIn";
  };

  const busy = confirm.isPending;

  const preventDismiss = (e) => e.preventDefault();

  return (
    <Dialog open modal>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-zinc-950/95 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={preventDismiss}
          onPointerDownOutside={preventDismiss}
          onInteractOutside={preventDismiss}
          onCloseAutoFocus={preventDismiss}
          className="fixed left-[50%] top-[50%] z-[201] w-[calc(100%-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-violet-300" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-white">
                Confirm your date of birth
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                One-time check. Required to continue.
              </DialogDescription>
            </div>
          </div>

          <p className="text-sm text-zinc-300 mb-5 leading-relaxed">
            Pact. is only available to users {MIN_AGE_YEARS} and older. Please enter your date of
            birth to continue using your account.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="age-gate-dob">Date of birth</Label>
              <Input
                id="age-gate-dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={maxDobForInput()}
                min="1900-01-01"
                autoComplete="bday"
                required
                disabled={busy}
                autoFocus
                aria-describedby="age-gate-dob-help"
              />
              <p id="age-gate-dob-help" className="text-xs text-zinc-400">
                Once confirmed, your date of birth cannot be changed.
              </p>
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

            <Button type="submit" className="w-full h-11" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  Confirming…
                </>
              ) : (
                "Confirm"
              )}
            </Button>

            <button
              type="button"
              onClick={onSignOut}
              className="w-full text-xs text-zinc-400 hover:text-white transition-colors pt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded"
              disabled={busy}
            >
              Sign out instead
            </button>
          </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
