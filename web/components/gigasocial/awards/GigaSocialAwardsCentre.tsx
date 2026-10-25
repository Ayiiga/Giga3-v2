"use client";

import Link from "next/link";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { AWARDS_PATHS, PACKAGE_DISCLAIMER } from "@/lib/gigasocial/awards/constants";
import { LoadingState } from "@/components/ui/LoadingState";

export function GigaSocialAwardsCentre({ sessionToken }: { sessionToken: string }) {
  const seasons = useQuery(api.gigaSocialAwards.listPublicSeasons, {});
  const myNominations = useQuery(api.gigaSocialAwards.listMyNominations, {
    sessionToken,
  });

  if (seasons === undefined) {
    return <LoadingState label="Loading GigaSocial Awards…" />;
  }

  const active = seasons[0] ?? null;

  return (
    <div className="space-y-4">
      <header className="saas-card rounded-2xl border border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">GigaSocial Awards</h2>
        <p className="mt-1 text-sm text-muted">
          Free nominations and free voting for creators across Ghana — expanding across Africa.
          Packages and tips never buy votes or change scores.
        </p>
        <p className="mt-2 text-xs text-muted">
          Operated by Giga3 AI. Not government-endorsed unless a documented endorsement is published.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={AWARDS_PATHS.home}
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Open Awards hub
          </Link>
          <Link
            href={AWARDS_PATHS.nominate}
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground"
          >
            Nominate / apply
          </Link>
        </div>
      </header>

      {active ? (
        <section className="saas-card rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">{active.title}</h3>
          <p className="mt-1 text-sm text-muted">Status: {active.status.replaceAll("_", " ")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
            <li>Promo payments: {active.promoPaymentsEnabled ? "enabled" : "not enabled"}</li>
            <li>Tips on candidate pages: {active.tipsEnabled ? "enabled" : "not enabled"}</li>
          </ul>
          <p className="mt-3 text-xs text-muted">{PACKAGE_DISCLAIMER}</p>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted">
          No published award season yet. Administrators can bootstrap a draft season from the admin
          Awards panel. Nothing is invented for display.
        </p>
      )}

      <section className="saas-card rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Your nominations</h3>
        {myNominations === undefined ? (
          <p className="mt-2 text-sm text-muted">Loading…</p>
        ) : myNominations.length === 0 ? (
          <p className="mt-2 text-sm text-muted">You have not submitted or received nominations yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myNominations.map((n) => (
              <li
                key={n.nominationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{n.displayName}</span>
                <span className="text-muted">{n.status.replaceAll("_", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
