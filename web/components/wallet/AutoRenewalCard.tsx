"use client";

import { Button } from "@/components/ui/Button";
import { formatExpiry } from "@/lib/credits/rules";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { CreditCard, RefreshCw, Smartphone } from "lucide-react";
import { useState } from "react";

type AutoRenewalCardProps = {
  sessionToken: string | null;
};

/** Auto-renewal controls: toggle, saved card summary, next charge date. */
export function AutoRenewalCard({ sessionToken }: AutoRenewalCardProps) {
  const settings = useQuery(
    api.subscriptions.getRenewalSettings,
    sessionToken ? { sessionToken } : "skip"
  );
  const setAutoRenew = useMutation(api.subscriptions.setAutoRenew);
  const removeMethod = useMutation(api.subscriptions.removeSavedPaymentMethod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionToken || settings === undefined) return null;
  if (settings === null) return null;

  const paid = settings.subscriptionPlan && settings.subscriptionPlan !== "free";
  const complimentary = settings.source === "complimentary";
  const method = settings.savedMethod;
  const canCharge = Boolean(method?.reusable);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setAutoRenew({ sessionToken: sessionToken!, enabled });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update renewal setting.");
    } finally {
      setBusy(false);
    }
  }

  async function forgetCard() {
    setBusy(true);
    setError(null);
    try {
      await removeMethod({ sessionToken: sessionToken! });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove payment method.");
    } finally {
      setBusy(false);
    }
  }

  let statusLine: string;
  if (!paid) {
    statusLine = "Subscribe to a plan and it will renew automatically each month unless you turn this off.";
  } else if (complimentary) {
    statusLine = `Complimentary access — no charges. Your plan ends ${formatExpiry(
      settings.subscriptionExpiresAt
    )}.`;
  } else if (!settings.autoRenew) {
    statusLine = `Automatic renewal is off. Your plan ends ${formatExpiry(
      settings.subscriptionExpiresAt
    )} and will not be charged again.`;
  } else if (canCharge) {
    statusLine = `Renews automatically around ${formatExpiry(
      settings.subscriptionExpiresAt
    )} using ${method?.label}.`;
  } else {
    statusLine = `Automatic renewal is on, but ${
      method ? method.label.toLowerCase() : "your payment method"
    } cannot be charged automatically. We'll email you before ${formatExpiry(
      settings.subscriptionExpiresAt
    )} so you can renew in one tap.`;
  }

  return (
    <section
      className="glass rounded-2xl border border-border p-6"
      aria-labelledby="auto-renew-heading"
      data-testid="auto-renewal-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="auto-renew-heading" className="text-lg font-semibold">
            Automatic renewal
          </h2>
          <p className="mt-1 text-sm text-muted">{statusLine}</p>
          {settings.renewalFailures > 0 && settings.autoRenew && (
            <p className="mt-2 text-sm text-amber-700">
              {settings.renewalFailures} recent renewal{" "}
              {settings.renewalFailures === 1 ? "attempt" : "attempts"} failed — check your
              card or renew manually below.
            </p>
          )}
        </div>
        <RefreshCw className="h-5 w-5 shrink-0 text-accent" aria-hidden />
      </div>

      {method && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          {method.channel === "mobile_money" ? (
            <Smartphone className="h-4 w-4 text-muted" aria-hidden />
          ) : (
            <CreditCard className="h-4 w-4 text-muted" aria-hidden />
          )}
          <span className="font-medium">{method.label}</span>
          {method.expMonth && method.expYear && (
            <span className="text-muted">
              exp {method.expMonth}/{method.expYear}
            </span>
          )}
          {!method.reusable && <span className="text-muted">· manual renewal</span>}
        </div>
      )}

      {!complimentary && (
        <div className="mt-5 flex flex-wrap gap-3">
          {settings.autoRenew ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => void toggle(false)}
            >
              Turn off auto-renewal
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void toggle(true)}
            >
              Turn on auto-renewal
            </Button>
          )}
          {method && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void forgetCard()}
            >
              Remove saved {method.channel === "card" ? "card" : "method"}
            </Button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <p className="mt-4 text-xs text-muted">
        Cards are charged in GHS via Paystack up to 2 days before your period ends; credits
        refill on the new period. Turning renewal off keeps your plan until the end date.
      </p>
    </section>
  );
}
