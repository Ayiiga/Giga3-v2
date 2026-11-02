"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export function AdminAwardsPanel({
  adminSessionToken,
}: {
  adminSessionToken: string;
}) {
  const creds = { adminSessionToken };
  const overview = useQuery(api.gigaSocialAwardsAdmin.getAdminSeasonOverview, creds);
  const bootstrap = useMutation(api.gigaSocialAwardsAdmin.bootstrapSeason);
  const setStatus = useMutation(api.gigaSocialAwardsAdmin.setSeasonStatus);
  const approve = useMutation(api.gigaSocialAwardsAdmin.approveNomination);
  const reject = useMutation(api.gigaSocialAwardsAdmin.rejectNomination);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (overview === undefined) {
    return <p className="text-sm text-muted">Loading awards admin…</p>;
  }

  return (
    <section className="saas-card space-y-4 rounded-2xl border border-border p-4">
      <header>
        <h2 className="text-lg font-semibold text-foreground">GigaSocial Awards</h2>
        <p className="mt-1 text-sm text-muted">
          Bootstrap draft seasons, open nominations/voting, and approve candidates. Promo payments
          and tips stay off until explicitly enabled. Packages never influence scores.
        </p>
      </header>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy !== null || Boolean(overview.season)}
          onClick={() =>
            void run(
              "boot",
              () => bootstrap({ ...creds, year }),
              `Draft season gsa-${year} created (not live).`
            )
          }
        >
          {overview.season ? `Season ${year} already created` : `Bootstrap draft ${year}`}
        </Button>
        {overview.season ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  "noms",
                  () =>
                    setStatus({
                      ...creds,
                      seasonId: overview.season!.seasonId,
                      status: "nominations_open",
                      confirm: true,
                    }),
                  "Nominations opened."
                )
              }
            >
              Open nominations
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  "vote",
                  () =>
                    setStatus({
                      ...creds,
                      seasonId: overview.season!.seasonId,
                      status: "voting_open",
                      confirm: true,
                    }),
                  "Voting opened (formulas locked)."
                )
              }
            >
              Open voting
            </Button>
          </>
        ) : null}
      </div>

      {overview.season ? (
        <p className="text-xs text-muted">
          This season already exists. You can manage its nomination and voting status below;
          bootstrapping it again is disabled to prevent duplicates.
        </p>
      ) : null}

      {overview.season ? (
        <p className="text-sm text-muted">
          Active: {overview.season.title} · {overview.season.status} · promoPayments=
          {String(overview.season.promoPaymentsEnabled)} · tips=
          {String(overview.season.tipsEnabled)}
        </p>
      ) : (
        <p className="text-sm text-muted">No seasons yet.</p>
      )}

      <div>
        <h3 className="text-sm font-semibold">Nominations queue</h3>
        {overview.nominations.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Empty.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {overview.nominations.slice(0, 20).map((n) => (
              <li
                key={n.nominationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {n.displayName} · {n.status}
                  {!n.hasConsent ? " · needs consent" : ""}
                </span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy !== null || !n.hasConsent}
                    onClick={() =>
                      void run(
                        `a-${n.nominationId}`,
                        () =>
                          approve({
                            ...creds,
                            nominationId: n.nominationId,
                            confirm: true,
                          }),
                        "Nomination approved."
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(
                        `r-${n.nominationId}`,
                        () =>
                          reject({
                            ...creds,
                            nominationId: n.nominationId,
                            reason: "Does not meet published eligibility.",
                            confirm: true,
                          }),
                        "Nomination rejected."
                      )
                    }
                  >
                    Reject
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Candidates</h3>
        {overview.candidates.length === 0 ? (
          <p className="mt-1 text-sm text-muted">None published.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {overview.candidates.map((c) => (
              <li key={c.candidateId}>
                {c.displayCode} — {c.displayName} ({c.status}, votes {c.voteCount})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
