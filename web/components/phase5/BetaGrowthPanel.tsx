"use client";

import { Button } from "@/components/ui/Button";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";

const COHORTS = [
  { id: "student", label: "Student" },
  { id: "teacher", label: "Teacher" },
  { id: "creator", label: "Creator" },
  { id: "community_leader", label: "Community leader" },
  { id: "trusted_tester", label: "Trusted tester" },
] as const;

/**
 * Public-beta join / redeem UI. Renders nothing unless phase5.beta is enabled.
 */
export function BetaGrowthPanel() {
  const flags = usePhase5Flags();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);
  const membership = useQuery(
    api.phase5Beta.getMyBetaMembership,
    flags.beta && sessionToken ? { sessionToken } : "skip"
  );
  const joinWaitlist = useMutation(api.phase5Beta.joinBetaWaitlist);
  const redeem = useMutation(api.phase5Beta.redeemBetaInvite);
  const completeOnboarding = useMutation(api.phase5Beta.completeBetaOnboarding);

  const [email, setEmail] = useState("");
  const [cohort, setCohort] = useState<(typeof COHORTS)[number]["id"]>("student");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!flags.beta) return null;

  async function onWaitlist(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await joinWaitlist({ email, cohort, reason: "Phase 5 waitlist" });
      setStatus(
        result.alreadyJoined
          ? "You are already on the waitlist."
          : "You're on the waitlist — we'll send an invite when a seat opens."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join waitlist.");
    } finally {
      setBusy(false);
    }
  }

  async function onRedeem(e: FormEvent) {
    e.preventDefault();
    if (!sessionToken) {
      setError("Sign in to redeem an invite code.");
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await redeem({ sessionToken, code });
      setStatus(
        result.alreadyMember
          ? `You are already in the ${result.cohort} cohort.`
          : `Welcome to the ${result.cohort} beta cohort.`
      );
      await completeOnboarding({ sessionToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redeem invite.");
    } finally {
      setBusy(false);
    }
  }

  const member = membership?.member;

  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Giga3 public beta</h1>
        <p className="mt-2 text-sm text-muted">
          Join a controlled cohort — students, teachers, creators, and community
          leaders. Existing production features stay unchanged.
        </p>
      </div>

      {member && (
        <div className="rounded-2xl border bg-card p-4 text-sm">
          You are in the <strong>{member.cohort}</strong> cohort
          {member.onboardedAt ? " and onboarding is complete." : "."}
        </div>
      )}

      {sessionToken && !member && (
        <form onSubmit={onRedeem} className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Have an invite code?</h2>
          <input
            className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-sm uppercase"
            placeholder="GIGA-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <Button type="submit" size="sm" disabled={busy}>
            Redeem invite
          </Button>
        </form>
      )}

      <form onSubmit={onWaitlist} className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Join the waitlist</h2>
        <label className="block text-sm">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          I am a
          <select
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            value={cohort}
            onChange={(e) => setCohort(e.target.value as (typeof COHORTS)[number]["id"])}
          >
            {COHORTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          Request access
        </Button>
      </form>

      {status && (
        <p className="text-sm text-emerald-700" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
