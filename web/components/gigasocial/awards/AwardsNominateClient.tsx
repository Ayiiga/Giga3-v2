"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

function NominateInner() {
  const sessionToken = useMemo(() => getSessionToken(), []);
  const seasons = useQuery(api.gigaSocialAwards.listPublicSeasons, {});
  const seasonSlug = seasons?.[0]?.slug;
  const season = useQuery(
    api.gigaSocialAwards.getPublicSeason,
    seasonSlug ? { slug: seasonSlug } : "skip"
  );
  const submit = useMutation(api.gigaSocialAwards.submitNomination);
  const respond = useMutation(api.gigaSocialAwards.respondToNomination);
  const mine = useQuery(
    api.gigaSocialAwards.listMyNominations,
    sessionToken ? { sessionToken } : "skip"
  );

  const [selfApplication, setSelfApplication] = useState(true);
  const [categorySlug, setCategorySlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [biography, setBiography] = useState("");
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (seasons === undefined) return <LoadingState label="Loading seasons…" />;
  if (!sessionToken) {
    return (
      <p className="text-sm text-muted">
        Sign in to nominate or apply.{" "}
        <a className="text-accent underline" href="/chat/login/">
          Sign in
        </a>
      </p>
    );
  }
  if (!season) {
    return (
      <p className="text-sm text-muted">
        Nominations are not open. No published award season is accepting entries right now.
      </p>
    );
  }

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await submit({
        sessionToken,
        seasonSlug: season.slug,
        categorySlug: categorySlug || season.categories[0]?.slug || "",
        selfApplication,
        nomineeDisplayName: displayName,
        nomineeHandle: handle || undefined,
        biography,
        portfolioLinks: links
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
      });
      setNotice(`Submitted — status: ${res.status}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit nomination.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Nominate or apply</h2>
        <p className="text-sm text-muted">
          Free to enter. Nominee consent is required before a public candidate profile is published.
          Purchasing a promotional package (when enabled) never buys votes or changes scores.
        </p>
        {!season.nominationsOpen ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Nominations are currently closed for {season.title}.
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={selfApplication}
            onChange={() => setSelfApplication(true)}
          />
          Apply for myself
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!selfApplication}
            onChange={() => setSelfApplication(false)}
          />
          Nominate another creator
        </label>
        <label className="block text-sm">
          <span className="font-medium">Category</span>
          <select
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            value={categorySlug || season.categories[0]?.slug || ""}
            onChange={(e) => setCategorySlug(e.target.value)}
          >
            {season.categories.map((c) => (
              <option key={c.categoryId} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Display name</span>
          <input
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={80}
          />
        </label>
        {!selfApplication ? (
          <label className="block text-sm">
            <span className="font-medium">Nominee GigaSocial handle (optional)</span>
            <input
              className="mt-1 w-full rounded-xl border border-border px-3 py-2"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="font-medium">Biography</span>
          <textarea
            className="mt-1 min-h-28 w-full rounded-xl border border-border px-3 py-2"
            value={biography}
            onChange={(e) => setBiography(e.target.value)}
            maxLength={4000}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Portfolio links (one per line)</span>
          <textarea
            className="mt-1 min-h-20 w-full rounded-xl border border-border px-3 py-2"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        <Button
          type="button"
          disabled={busy || !season.nominationsOpen}
          onClick={() => void onSubmit()}
          className="min-h-11"
        >
          {busy ? "Submitting…" : "Submit"}
        </Button>
      </section>

      {mine && mine.some((n) => n.awaitingMyConsent) ? (
        <section className="space-y-2 rounded-2xl border border-border p-4">
          <h3 className="text-sm font-semibold">Awaiting your consent</h3>
          {mine
            .filter((n) => n.awaitingMyConsent)
            .map((n) => (
              <div
                key={n.nominationId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{n.displayName}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void respond({
                        sessionToken,
                        nominationId: n.nominationId,
                        accept: true,
                      })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void respond({
                        sessionToken,
                        nominationId: n.nominationId,
                        accept: false,
                      })
                    }
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
        </section>
      ) : null}
    </div>
  );
}

export function AwardsNominateClient() {
  return (
    <ConvexAppShell>
      <NominateInner />
    </ConvexAppShell>
  );
}
