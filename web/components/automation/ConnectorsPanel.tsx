"use client";

import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { getSessionToken } from "@/lib/auth";
import { INTEGRATION_STATUS_LABELS } from "@/lib/automation/integrations";
import { cn } from "@/lib/utils";
import {
  validateMoodleSiteUrl,
  validateMoodleToken,
} from "../../../convex/connectors/moodleUrl";
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
  const [moodleUrlError, setMoodleUrlError] = useState<string | null>(null);
  const [moodleTokenError, setMoodleTokenError] = useState<string | null>(null);

  const handleConnect = useCallback(
    async (card: ConnectorCard) => {
      if (!sessionToken) {
        setError("Sign in to connect integrations.");
        return;
      }
      if (card.id === "moodle") {
        setMoodleOpen(true);
        setMoodleUrlError(null);
        setMoodleTokenError(null);
        setError(null);
        return;
      }
      setBusyId(card.id);
      setError(null);
      try {
        const result = await startOAuth({
          sessionToken,
          provider: card.id,
          returnPath: "/automation/?tab=integrations",
        });
        window.location.href = result.authorizeUrl;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start connection.");
        setBusyId(null);
      }
    },
    [sessionToken, startOAuth]
  );

  const handleMoodleConnect = useCallback(async () => {
    if (!sessionToken || busyId === "moodle") return;

    const urlCheck = validateMoodleSiteUrl(moodleUrl);
    if (!urlCheck.ok) {
      setMoodleUrlError(urlCheck.message);
      setMoodleTokenError(null);
      return;
    }
    const tokenCheck = validateMoodleToken(moodleToken);
    if (!tokenCheck.ok) {
      setMoodleUrlError(null);
      setMoodleTokenError(tokenCheck.message);
      return;
    }

    setMoodleUrlError(null);
    setMoodleTokenError(null);
    setBusyId("moodle");
    setError(null);
    try {
      await connectMoodle({
        sessionToken,
        siteUrl: urlCheck.normalized,
        token: tokenCheck.token,
      });
      setMoodleOpen(false);
      setMoodleUrl("");
      setMoodleToken("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moodle connection failed.");
    } finally {
      setBusyId(null);
    }
  }, [busyId, connectMoodle, moodleToken, moodleUrl, sessionToken]);

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
  const moodleConnecting = busyId === "moodle";

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
      {data.summary.needsConfiguration > 0 ? (
        <p className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted">
          Providers marked Needs configuration are waiting for server-side{" "}
          <code className="text-[11px]">*_CONNECTOR_*</code> secrets on Convex (never{" "}
          <code className="text-[11px]">NEXT_PUBLIC_*</code>, and never social-login{" "}
          <code className="text-[11px]">AUTH_*</code> / Google sign-in client IDs). Redirect URI:{" "}
          <code className="break-all text-[11px]">
            {(data as { oauthCallbackUrl?: string | null }).oauthCallbackUrl ||
              "https://perfect-lark-521.convex.site/connectors/oauth/callback"}
          </code>
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
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

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
                  Needs Convex env: {card.missingEnvKeys.join(", ")}. Set these on the
                  Convex dashboard (server-only). See docs/CONNECTORS.md.
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
            Enter your public HTTPS Moodle site URL and a personal web-service token — not an
            administrator password. Example: https://learn.example.edu
          </p>
          <label className="block text-xs" htmlFor="moodle-site-url">
            Site URL
            <input
              id="moodle-site-url"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="https://learn.example.edu"
              value={moodleUrl}
              disabled={moodleConnecting}
              onChange={(e) => {
                setMoodleUrl(e.target.value);
                setMoodleUrlError(null);
              }}
              onBlur={() => {
                if (!moodleUrl.trim()) return;
                const check = validateMoodleSiteUrl(moodleUrl);
                setMoodleUrlError(check.ok ? null : check.message);
              }}
            />
          </label>
          {moodleUrlError ? (
            <p className="text-xs text-red-600" role="alert" data-testid="moodle-url-error">
              {moodleUrlError}
            </p>
          ) : null}
          <label className="block text-xs" htmlFor="moodle-token">
            Web service token
            <input
              id="moodle-token"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              type="password"
              autoComplete="off"
              value={moodleToken}
              disabled={moodleConnecting}
              onChange={(e) => {
                setMoodleToken(e.target.value);
                setMoodleTokenError(null);
              }}
            />
          </label>
          {moodleTokenError ? (
            <p className="text-xs text-red-600" role="alert" data-testid="moodle-token-error">
              {moodleTokenError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={moodleConnecting}
              onClick={() => void handleMoodleConnect()}
            >
              {moodleConnecting ? "Connecting…" : "Save connection"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={moodleConnecting}
              onClick={() => {
                setMoodleOpen(false);
                setMoodleUrlError(null);
                setMoodleTokenError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
