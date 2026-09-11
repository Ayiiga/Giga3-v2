"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getSessionToken, getUserEmail } from "@/lib/auth";
import { buildUserDeveloperApiUrl } from "@/lib/developer/userApi";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

/** Only scope enforced on GET /api/v1/me today. */
const DEFAULT_SCOPES = ["chat:read"] as const;

function DeveloperApiKeysPanelInner() {
  const email = getUserEmail();
  const [mounted, setMounted] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [label, setLabel] = useState("My integration");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  const usage = useQuery(
    api.credits.getUsageSnapshot,
    mounted && sessionToken ? { sessionToken } : "skip"
  );

  const keys = useQuery(
    api.apiKeys.listMyKeys,
    mounted && sessionToken ? { sessionToken } : "skip"
  );

  const createKey = useAction(api.apiKeysActions.createKey);
  const revokeKey = useMutation(api.apiKeys.revokeKey);

  const canManageKeys =
    Boolean(email) &&
    usage?.subscriptionPlan === "premium" &&
    usage?.subscriptionActive;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken || !canManageKeys) return;
    setBusy(true);
    setError(null);
    setRevealedKey(null);
    try {
      const result = await createKey({
        sessionToken,
        label,
        scopes: [...DEFAULT_SCOPES],
      });
      setRevealedKey(result.rawKey);
      setLabel("My integration");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(keyId: Id<"apiKeys">) {
    if (!sessionToken) return;
    setBusy(true);
    setError(null);
    try {
      await revokeKey({ sessionToken, keyId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke API key.");
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return <p className="text-sm text-muted">Loading API key manager…</p>;
  }

  if (!email || !sessionToken) {
    return (
      <div className="rounded-2xl border border-border bg-slate-50 p-4 text-sm text-muted">
        <p>
          <ButtonLink href="/chat/login?next=%2Fdevelopers%23user-api-keys" variant="ghost" size="sm">
            Sign in
          </ButtonLink>{" "}
          to create Premium user API keys.
        </p>
      </div>
    );
  }

  if (!canManageKeys) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p>
          Developer API keys require an active Premium subscription. Upgrade at{" "}
          <ButtonLink href="/pricing/" variant="ghost" size="sm">
            /pricing
          </ButtonLink>{" "}
          or manage your plan in{" "}
          <ButtonLink href="/wallet/?tab=subscription" variant="ghost" size="sm">
            wallet
          </ButtonLink>
          .
        </p>
      </div>
    );
  }

  const activeKeys = (keys ?? []).filter((key) => !key.revokedAt);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void handleCreate(e)} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Key label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={80}
            className="rounded-xl border border-border px-3 py-2"
            placeholder="My integration"
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create API key"}
        </Button>
      </form>

      <p className="text-xs text-muted">
        New keys include the <code>chat:read</code> scope for{" "}
        <code>{buildUserDeveloperApiUrl("me")}</code>. Copy the full key once — it is not shown
        again.
      </p>

      {revealedKey ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-medium text-emerald-950">Copy your new API key now</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs">{revealedKey}</pre>
        </div>
      ) : null}

      {activeKeys.length > 0 ? (
        <ul className="space-y-2">
          {activeKeys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">{key.label}</p>
                <p className="text-xs text-muted">
                  {key.keyPrefix}… · {key.scopes.join(", ")}
                  {key.lastUsedAt
                    ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void handleRevoke(key.id)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No active API keys yet.</p>
      )}
    </div>
  );
}

export function DeveloperApiKeysPanel() {
  return (
    <ConvexAppShell>
      <DeveloperApiKeysPanelInner />
    </ConvexAppShell>
  );
}
