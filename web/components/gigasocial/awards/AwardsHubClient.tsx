"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { LoadingState } from "@/components/ui/LoadingState";
import { AWARDS_PATHS, PACKAGE_DISCLAIMER } from "@/lib/gigasocial/awards/constants";

function HubInner() {
  const seasons = useQuery(api.gigaSocialAwards.listPublicSeasons, {});
  const slug = seasons?.[0]?.slug;
  const season = useQuery(
    api.gigaSocialAwards.getPublicSeason,
    slug ? { slug } : "skip"
  );
  const announcements = useQuery(
    api.gigaSocialAwards.listPublicAnnouncements,
    slug ? { seasonSlug: slug } : "skip"
  );

  if (seasons === undefined) return <LoadingState label="Loading awards…" />;

  if (!season) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          No live GigaSocial Awards season is published yet. Free nominations and voting will appear
          here when administrators open a season.
        </p>
        <Link href="/gigasocial/?tab=creator" className="text-sm text-accent underline">
          Back to creator tools
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{season.title}</h2>
        <p className="text-sm text-muted">Status: {season.status.replaceAll("_", " ")}</p>
        <p className="text-xs text-muted">{season.operatorDisclosure}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={AWARDS_PATHS.nominate}
            className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground"
          >
            Nominate / apply
          </Link>
          <Link
            href={AWARDS_PATHS.gigasocialTab}
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-medium"
          >
            Creator Awards panel
          </Link>
        </div>
      </section>

      {announcements && announcements.length > 0 ? (
        <section className="space-y-3" aria-label="Awards announcements">
          <div>
            <h3 className="text-lg font-bold text-foreground">News & announcements</h3>
            <p className="text-xs text-muted">Updates, nomination campaigns, voting reminders and partner messages.</p>
          </div>
          <div className="grid gap-3">
            {announcements.map((item) => (
              <article
                key={item.announcementId}
                className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="max-h-52 w-full object-cover" loading="lazy" />
                ) : null}
                <div className="space-y-2 p-4">
                  <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                    {item.kind.replaceAll("_", " ")}
                  </span>
                  <h4 className="text-base font-bold text-slate-950">{item.title}</h4>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{item.body}</p>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("https://") ? "_blank" : undefined}
                      rel={item.href.startsWith("https://") ? "noopener noreferrer" : undefined}
                      className="inline-flex min-h-10 items-center rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
                    >
                      {item.ctaLabel || "Learn more"}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Categories</h3>
        <ul className="space-y-2">
          {season.categories.map((c) => (
            <li key={c.categoryId} className="rounded-xl border border-border px-3 py-3 text-sm">
              <p className="font-semibold text-foreground">{c.name}</p>
              <p className="mt-1 text-muted">{c.description}</p>
              <p className="mt-2 text-xs text-muted">
                {c.formula.peoplesChoice
                  ? "Formula: People’s Choice (voting only)"
                  : `Formula: ${c.formula.publicVoteWeight}/${c.formula.judgingWeight}/${c.formula.assessmentWeight} (public/judging/assessment)`}
                {c.formula.locked ? " · locked" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Promotional packages</h3>
        <p className="text-xs text-muted">{PACKAGE_DISCLAIMER}</p>
        <ul className="space-y-2">
          {season.packages.map((p) => (
            <li key={p.packageId} className="rounded-xl border border-border px-3 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p className="font-semibold">{p.name}</p>
                <p>GH₵{p.priceGhs}</p>
              </div>
              <p className="mt-1 text-muted">{p.description}</p>
              <p className="mt-2 text-xs text-muted">
                {p.checkoutAvailable
                  ? "Checkout available"
                  : p.priceGhs === 0
                    ? "Free — no purchase required"
                    : "Checkout not enabled for this season"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Confirmed prizes</h3>
        {season.prizes.length === 0 ? (
          <p className="text-sm text-muted">
            No funded or contractually guaranteed prizes are advertised yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {season.prizes.map((p) => (
              <li key={p.prizeId} className="rounded-xl border border-border px-3 py-3 text-sm">
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-muted">{p.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AwardsHubClient() {
  return (
    <ConvexAppShell>
      <HubInner />
    </ConvexAppShell>
  );
}
