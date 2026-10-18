"use client";

import { Button } from "@/components/ui/Button";
import {
  CREATOR_MONETIZATION_POLICY_SECTIONS,
  CREATOR_MONETIZATION_POLICY_TITLE,
  CREATOR_MONETIZATION_POLICY_VERSION,
} from "@/lib/gigasocial/creatorMonetizationPolicy";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2, ScrollText } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialMonetizationAccept = memo(function GigaSocialMonetizationAccept({
  sessionToken,
  onAccepted,
}: {
  sessionToken: string;
  onAccepted?: () => void;
}) {
  const accept = useMutation(api.gigaSocialEconomy.acceptMonetizationTerms);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    if (!checked) {
      setError("Confirm you have read the creator monetisation rules.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await accept({
        sessionToken,
        policyVersion: CREATOR_MONETIZATION_POLICY_VERSION,
      });
      onAccepted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record acceptance.");
    } finally {
      setBusy(false);
    }
  }, [accept, checked, onAccepted, sessionToken]);

  return (
    <section className="saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ScrollText className="h-4 w-4 text-violet-700" aria-hidden />
        {CREATOR_MONETIZATION_POLICY_TITLE}
      </h3>
      <p className="mt-1 text-xs text-muted">
        Policy version {CREATOR_MONETIZATION_POLICY_VERSION}. Acceptance is recorded on the server.
      </p>
      <div className="mt-3 max-h-56 space-y-3 overflow-y-auto overscroll-contain rounded-xl border border-border bg-white p-3 text-sm">
        {CREATOR_MONETIZATION_POLICY_SECTIONS.map((section) => (
          <div key={section.heading}>
            <p className="font-semibold text-foreground">{section.heading}</p>
            <p className="mt-0.5 text-muted">{section.body}</p>
          </div>
        ))}
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1"
        />
        <span>I have read and accept the creator monetisation rules and platform policies.</span>
      </label>
      <Button
        type="button"
        className="mt-3"
        disabled={busy || !checked}
        onClick={() => void handleAccept()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Accept and activate earning
      </Button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
});
