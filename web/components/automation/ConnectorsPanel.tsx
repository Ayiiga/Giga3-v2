"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { getSessionToken } from "@/lib/auth";
import { INTEGRATION_STATUS_LABELS } from "@/lib/automation/integrations";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

type ConnectorCard = {
  id: string;
  label: string;
  category: string;
  description: string;
  status: keyof typeof INTEGRATION_STATUS_LABELS;
  statusLabel: string;
  href?: string;
  setupNotes?: string;
  accountLabel?: string | null;
  missingEnvKeys?: string[];
  mayNeedProviderApproval?: boolean;
  canConnect: boolean;
  canDisconnect: boolean;
  canReconnect: boolean;
};

export function ConnectorsPanel() {
  const sessionToken = getSessionToken() ?? undefined;
  const data = useQuery(api.connectors.status.listConnectorStatuses, {
    sessionToken,
  });
  const startOAuth = useAction(api.connectors.oauth.startOAuth);
  const disconnect = useAction(api.connectors.oauth.disconnect);
  const connectMoodle = useAction(api.connectors.oauth.connectMoodle);

  const params = useSearchParams();
  const flash = useMemo(() => {
    const connected = params.get("connector_connected");
    const error = params.get("connector_error");
    if (connected) return { kind: "ok" as const, text: `Connected ${connected}.` };
    if (error) return { kind: "err" as const, text: `Connection issue: ${error}` };
    return null;
  }, [params]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moodleOpen, setMoodleOpen] = useState(false);
  const [moodleUrl, setMoodleUrl] = useState("");
  const [moodleToken, setMoodleToken] = useState("");

  const handleConnect = useCallback(
    async (card: ConnectorCard) => {
      if (!sessionToken) {
        setError("Sign in to connect integrations.");
        return;
      }
      setBusyId(card.id);
      setError(null);
      try {
        if (card.id === "moodle") {
          setMoodleOpen(true);
          return;
        }
        const result = await startOAuth({
          sessionToken,
          provider: card.id,
          returnPath: "/automation/?tab=integrations",
        });
        window.location.href = result.authorizeUrl;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start connection.");
      } finally {
        setBusyId(null);
      }
    },
    [sessionToken, startOAuth]
  );

  const handleMoodleConnect = useCallback(async () => {
    if (!sessionToken) return;
    setBusyId("moodle");
    setError(null);
    try {
      await connectMoodle({
        sessionToken,
        siteUrl: moodleUrl,
        token: moodleToken,
      });
      setMoodleOpen(false);
      setMoodleToken("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moodle connection failed.");
    } finally {
      setBusyId(null);
    }
  }, [connectMoodle, moodleToken, moodleUrl, sessionToken]);

  const handleDisconnect = useCallback(
    async (provider: string) => {
      if (!sessionToken) return;
      setBusyId(provider);
      setError(null);
      try {
        await disconnect({ sessionToken, provider });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Disconnect failed.");
      } finally {
        setBusyId(null);
      }
    },
    [disconnect, sessionToken]
  );

  if (data === undefined) {
    return <LoadingState label="Loading connectors…" />;
  }

  const cards = data.cards as ConnectorCard[];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {data.summary.active} active/connected · {data.summary.available} available ·{" "}
        {data.summary.needsConfiguration} need configuration
        {data.summary.needsReauth ? ` · ${data.summary.needsReauth} need reauth` : ""}
      </p>
      {!data.authenticated ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
          Sign in to connect external services. Platform tools stay available without a
          connector account.
        </p>
      ) : null}
      {flash ? (
        <p
          className={cn(
            "rounded-xl border px-3 py-2 text-sm",
            flash.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5 text-red-700"
          )}
        >
          {flash.text}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const tone =
            card.status === "active" || card.status === "connected"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : card.status === "needs_configuration" || card.status === "needs_reauth"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border";
          return (
            <article key={card.id} className={cn("rounded-xl border px-4 py-3 text-sm", tone)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{card.label}</p>
                  <p className="text-[11px] text-muted">{card.category}</p>
                </div>
                <span className="shrink-0 text-xs font-medium">
                  {card.statusLabel || INTEGRATION_STATUS_LABELS[card.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{card.description}</p>
              {card.accountLabel ? (
                <p className="mt-1 text-xs text-foreground">Account: {card.accountLabel}</p>
              ) : null}
              {card.status === "needs_configuration" && card.missingEnvKeys?.length ? (
                <p className="mt-2 text-xs text-amber-800">
                  Server missing: {card.missingEnvKeys.join(", ")}. Set these on Convex
                  (never NEXT_PUBLIC).
                </p>
              ) : null}
              {card.mayNeedProviderApproval ? (
                <p className="mt-1 text-[11px] text-muted">
                  Restricted provider scopes may require Google verification before
                  non-test users can connect.
                </p>
              ) : null}
              {card.setupNotes ? (
                <p className="mt-1 text-[11px] text-muted">{card.setupNotes}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {card.href ? (
                  <Link
                    href={card.href}
                    className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-muted/10"
                  >
                    Open
                  </Link>
                ) : null}
                {card.canConnect || card.canReconnect ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={busyId === card.id}
                    onClick={() => void handleConnect(card)}
                  >
                    {card.status === "needs_reauth" ? "Reconnect" : "Connect"}
                  </Button>
                ) : null}
                {card.canDisconnect ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busyId === card.id}
                    onClick={() => void handleDisconnect(card.id)}
                  >
                    Disconnect
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {moodleOpen ? (
        <div className="saas-card space-y-3 rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold">Connect Moodle LMS</h3>
          <p className="text-xs text-muted">
            Use your personal Moodle web-service token — not an administrator password.
          </p>
          <label className="block text-xs">
            Site URL
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="https://learn.example.edu"
              value={moodleUrl}
              onChange={(e) => setMoodleUrl(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            Web service token
            <input
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              type="password"
              autoComplete="off"
              value={moodleToken}
              onChange={(e) => setMoodleToken(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busyId === "moodle"}
              onClick={() => void handleMoodleConnect()}
            >
              Save connection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMoodleOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
