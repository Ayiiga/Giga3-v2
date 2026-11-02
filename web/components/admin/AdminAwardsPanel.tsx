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
  const publishAnnouncement = useMutation(api.gigaSocialAwardsAdmin.publishAnnouncement);
  const [announcementSeasonId, setAnnouncementSeasonId] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementKind, setAnnouncementKind] = useState<
    "announcement" | "nominations" | "voting" | "candidate" | "sponsor"
  >("announcement");
  const [announcementHref, setAnnouncementHref] = useState("");
  const [announcementCta, setAnnouncementCta] = useState("Learn more");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const year = new Date().getFullYear();
  const announcementSeasons = (overview?.seasons ?? []).filter(
    (season) => season.status !== "draft" && season.status !== "archived"
  );
  const selectedAnnouncementSeason =
    announcementSeasons.find((season) => season.seasonId === announcementSeasonId) ??
    announcementSeasons[0] ??
    null;

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
          disabled={busy !== null || overview.season?.year === year}
          onClick={() =>
            void run(
              "boot",
              () => bootstrap({ ...creds, year }),
              `Draft season gsa-${year} created (not live).`
            )
          }
        >
          {overview.season?.year === year ? `Season ${year} already created` : `Bootstrap draft ${year}`}
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
                      seasonId: selectedAnnouncementSeason!.seasonId,
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

      {overview.season?.year === year ? (
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

      {overview.season && overview.season.status !== "draft" && overview.season.status !== "archived" ? (
        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <div>
            <h3 className="font-semibold text-foreground">Awards announcements & promotions</h3>
            <p className="mt-1 text-xs text-muted">
              Publish nomination calls, voting reminders, candidate highlights and sponsor notices
              to the public Awards page.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Public season
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3"
              value={selectedAnnouncementSeason?.seasonId ?? ""}
              onChange={(event) => setAnnouncementSeasonId(event.target.value)}
              disabled={announcementSeasons.length === 0}
            >
              {announcementSeasons.length === 0 ? (
                <option value="">No published season available</option>
              ) : (
                announcementSeasons.map((season) => (
                  <option key={season.seasonId} value={season.seasonId}>
                    {season.title} · {season.status.replaceAll("_", " ")}
                  </option>
                ))
              )}
            </select>
            <span className="mt-1 block text-xs text-muted">
              Choose the season currently shown to visitors. Draft and archived seasons cannot receive public announcements.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Announcement title
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3"
              maxLength={120}
              value={announcementTitle}
              onChange={(event) => setAnnouncementTitle(event.target.value)}
              placeholder="e.g. GigaSocial Awards nominations are open"
            />
          </label>
          <label className="block text-sm font-medium">
            Message
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-border bg-white p-3"
              maxLength={1200}
              value={announcementBody}
              onChange={(event) => setAnnouncementBody(event.target.value)}
              placeholder="Tell the community what is happening and what action to take."
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Type
              <select
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3"
                value={announcementKind}
                onChange={(event) => setAnnouncementKind(event.target.value as typeof announcementKind)}
              >
                <option value="announcement">General announcement</option>
                <option value="nominations">Nomination campaign</option>
                <option value="voting">Voting reminder</option>
                <option value="candidate">Candidate highlight</option>
                <option value="sponsor">Sponsor / advertisement</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Button label
              <input
                className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3"
                maxLength={50}
                value={announcementCta}
                onChange={(event) => setAnnouncementCta(event.target.value)}
                placeholder="Learn more"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Link (optional)
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-border bg-white px-3"
              maxLength={500}
              value={announcementHref}
              onChange={(event) => setAnnouncementHref(event.target.value)}
              placeholder="/gigasocial/awards/ or https://sponsor.example"
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={
              busy !== null ||
              !selectedAnnouncementSeason ||
              announcementTitle.trim().length < 4 ||
              announcementBody.trim().length < 12
            }
            onClick={() =>
              void run(
                "announcement",
                async () => {
                  await publishAnnouncement({
                    ...creds,
                    seasonId: overview.season!.seasonId,
                    title: announcementTitle,
                    body: announcementBody,
                    kind: announcementKind,
                    href: announcementHref.trim() || undefined,
                    ctaLabel: announcementCta.trim() || undefined,
                  });
                  setAnnouncementTitle("");
                  setAnnouncementBody("");
                  setAnnouncementHref("");
                },
                "Awards announcement published to the public Awards page."
              )
            }
          >
            Publish announcement
          </Button>
        </div>
      ) : null}

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
