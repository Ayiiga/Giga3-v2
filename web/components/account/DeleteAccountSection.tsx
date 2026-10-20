"use client";

import { Button } from "@/components/ui/Button";
import { clearAllClientAuth, getSessionToken, getUserEmail } from "@/lib/auth";
import { isSupabaseDataBackend } from "@/lib/dataBackend";
import { safeNavigate } from "@/lib/navigation/safeNavigate";
import { signOutSupabase } from "@/lib/supabase/auth";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  email: string;
};

/**
 * Danger-zone self-delete. Server requires confirmEmail === session email.
 */
export function DeleteAccountSection({ email }: Props) {
  const deleteMyAccount = useMutation(api.accountDeletion.deleteMyAccount);
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTarget = email.trim().toLowerCase();
  const canSubmit =
    confirmEmail.trim().toLowerCase() === normalizedTarget && !busy;

  async function onDelete() {
    const sessionToken = getSessionToken();
    if (!sessionToken) {
      setError("Sign in again to delete your account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount({
        sessionToken,
        confirmEmail: confirmEmail.trim(),
      });
      try {
        if (isSupabaseDataBackend()) {
          void signOutSupabase();
        } else {
          clearAllClientAuth();
        }
      } catch {
        clearAllClientAuth();
      }
      safeNavigate("/chat/login/?deleted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20"
      data-testid="delete-account-section"
      aria-labelledby="delete-account-heading"
    >
      <h2 id="delete-account-heading" className="text-sm font-semibold text-rose-800 dark:text-rose-200">
        Delete account
      </h2>
      <p className="mt-1 text-xs text-rose-700/90 dark:text-rose-300/90">
        Permanently delete your Giga3 AI account, password credentials, and chat
        history for {getUserEmail() ?? email}. This cannot be undone.
      </p>

      {!open ? (
        <button
          type="button"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 text-sm font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/40"
          data-testid="delete-account-open"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete account
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <label className="block text-xs font-medium text-rose-900 dark:text-rose-100">
            Type <span className="font-mono">{normalizedTarget}</span> to confirm
            <input
              type="email"
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-xl border border-rose-300 bg-white px-3 text-sm text-foreground dark:border-rose-800 dark:bg-slate-950"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              data-testid="delete-account-confirm-email"
              placeholder={normalizedTarget}
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 flex-1"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmEmail("");
                setError(null);
              }}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={!canSubmit}
              data-testid="delete-account-confirm"
              onClick={() => void onDelete()}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
