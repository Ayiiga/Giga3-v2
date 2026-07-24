"use client";

import { GigaSocialPanelErrorBoundary } from "@/components/gigasocial/GigaSocialPanelErrorBoundary";
import { GigaSocialUnreadLoader } from "@/components/gigasocial/GigaSocialUnreadLoader";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import { getSessionToken } from "@/lib/auth";
import { getGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import {
  GIGASOCIAL_SECTIONS,
  type GigaSocialSection,
} from "@/lib/gigasocial/sections";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import dynamic from "next/dynamic";
import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

const panelLoading = (label: string) => (
  <LoadingState label={label} className="py-8" />
);

const GigaSocialFeedPanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialFeedPanel").then((m) => ({
      default: m.GigaSocialFeedPanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading feed…") }
);

const GigaSocialDiscoverPanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialDiscoverPanel").then((m) => ({
      default: m.GigaSocialDiscoverPanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading discover…") }
);

const GigaSocialCommunitiesPanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialCommunitiesPanel").then((m) => ({
      default: m.GigaSocialCommunitiesPanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading communities…") }
);

const GigaSocialLivePanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/live/GigaSocialLivePanel").then((m) => ({
      default: m.GigaSocialLivePanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading live…") }
);

const GigaSocialCreatorPanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/economy/GigaSocialCreatorPanel").then((m) => ({
      default: m.GigaSocialCreatorPanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading creator tools…") }
);

const GigaSocialProfilePanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialProfilePanel").then((m) => ({
      default: m.GigaSocialProfilePanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading profile…") }
);

const GigaSocialNotificationsPanel = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigasocial/GigaSocialNotificationsPanel").then((m) => ({
      default: m.GigaSocialNotificationsPanel,
    }))
  ),
  { ssr: false, loading: () => panelLoading("Loading notifications…") }
);

function GigaSocialContent() {
  useRenderDiagnostic("GigaSocialContent");

  const router = useRouter();
  const params = useSearchParams();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const initialTab = (params.get("tab") as GigaSocialSection) || "feed";
  const [section, setSection] = useState<GigaSocialSection>(
    GIGASOCIAL_SECTIONS.some((s) => s.id === initialTab) ? initialTab : "feed"
  );
  const [communitySlug, setCommunitySlug] = useState<string | undefined>(
    params.get("community") ?? undefined
  );
  const highlightPostId = params.get("highlight")?.trim() || undefined;
  const [unread, setUnread] = useState(0);
  const handleUnread = useCallback((count: number) => setUnread(count), []);

  const ensureMyProfile = useMutation(api.gigaSocial.ensureMyProfile);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  useEffect(() => {
    if (!sessionToken) return;
    void ensureMyProfile({ sessionToken }).catch(() => {
      /* Profile bootstrap is best-effort; feed must still load if this fails. */
    });
  }, [ensureMyProfile, sessionToken]);

  useEffect(() => {
    if (mounted && !sessionToken) {
      router.replace("/chat/login?next=/gigasocial");
    }
  }, [mounted, sessionToken, router]);

  useEffect(() => {
    const tab = params.get("tab") as GigaSocialSection;
    if (tab && GIGASOCIAL_SECTIONS.some((s) => s.id === tab)) {
      setSection(tab);
    }
    const community = params.get("community");
    if (community) setCommunitySlug(community);
    const highlight = params.get("highlight");
    if (highlight && section !== "feed") setSection("feed");
  }, [params, section]);

  if (!mounted || !sessionToken) {
    return <p className="text-center text-base text-muted">Redirecting…</p>;
  }

  const features = getGigaSocialFeatures();

  const openSection = (id: GigaSocialSection) => {
    setSection(id);
    if (id !== "feed") setCommunitySlug(undefined);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", id);
    router.replace(`/gigasocial/?${params.toString()}`, { scroll: false });
  };

  const isFeedSection = section === "feed";

  return (
    <div
      className={cn(
        "gigasocial-stable gigasocial-pro mx-auto max-w-6xl",
        isFeedSection ? "space-y-2" : "space-y-3 sm:space-y-4"
      )}
    >
      <GigaSocialUnreadLoader sessionToken={sessionToken} onUnread={handleUnread} />
      <header
        className={cn(
          "gigasocial-shell-header flex flex-wrap items-center justify-between gap-2",
          isFeedSection && "gap-1.5"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href={siteConfig.links.dashboard}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted hover:border-accent/30 hover:text-foreground sm:h-9 sm:w-auto sm:gap-1.5 sm:px-2.5 sm:py-1"
            aria-label="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden text-sm sm:inline">Chat</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white sm:h-9 sm:w-9 sm:rounded-xl">
              <UsersRound className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </div>
            <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-xl">
              GigaSocial
            </h1>
          </div>
          <p className="sr-only">
            Connect, share, learn, and collaborate across the Giga3 AI community.
          </p>
        </div>
        {communitySlug ? (
          <div className="rounded-full border border-border px-2.5 py-1 text-xs sm:rounded-2xl sm:px-4 sm:py-2 sm:text-sm">
            <span className="font-medium capitalize">{communitySlug}</span>
            <button
              type="button"
              className="ml-1.5 text-accent hover:underline"
              onClick={() => setCommunitySlug(undefined)}
            >
              Clear
            </button>
          </div>
        ) : null}
      </header>

      <nav
        className="flex gap-1 overflow-x-auto overscroll-x-contain sm:gap-1.5"
        aria-label="GigaSocial sections"
      >
        {GIGASOCIAL_SECTIONS.filter((item) =>
          item.id === "live" ? features.enableGigaLive : true
        ).map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openSection(item.id)}
              className={cn(
                "relative inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:min-h-9 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
                active
                  ? item.id === "live"
                    ? "border-red-500/50 bg-red-50 text-red-800"
                    : "border-accent/40 bg-accent/10 text-foreground"
                  : item.id === "live"
                    ? "border-red-200 bg-white text-red-700 hover:border-red-400/40"
                    : "border-border bg-white text-muted hover:border-accent/25"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
              {item.id === "notifications" && unread > 0 && (
                <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <section
        className={cn(
          "gigasocial-feed-shell rounded-xl border border-border sm:rounded-2xl",
          isFeedSection ? "p-2 sm:p-4" : "p-3 sm:p-4"
        )}
      >
        {section === "feed" && (
          <GigaSocialPanelErrorBoundary panelName="Feed">
            <GigaSocialFeedPanel
                sessionToken={sessionToken}
                communitySlug={communitySlug}
                highlightPostId={highlightPostId}
                autoOpenStories={params.get("stories") === "1"}
                autoOpenStoriesRing={params.get("ring")?.trim() || undefined}
                onOpenLive={features.enableGigaLive ? () => openSection("live") : undefined}
            />
          </GigaSocialPanelErrorBoundary>
        )}

        {section === "discover" && (
          <>
            <SectionIntro
              title="Discover"
              description="Trending posts, creators, educational content, and popular AI topics."
            />
            <GigaSocialPanelErrorBoundary panelName="Discover">
              <GigaSocialDiscoverPanel sessionToken={sessionToken} />
            </GigaSocialPanelErrorBoundary>
          </>
        )}

        {section === "communities" && (
          <>
            <SectionIntro
              title="Communities"
              description="Browse and join topic groups — education, tech, business, AI, and more."
            />
            <GigaSocialPanelErrorBoundary panelName="Communities">
              <GigaSocialCommunitiesPanel
                sessionToken={sessionToken}
                onSelectCommunity={(slug) => {
                  setCommunitySlug(slug);
                  setSection("feed");
                }}
              />
            </GigaSocialPanelErrorBoundary>
          </>
        )}

        {section === "live" && features.enableGigaLive && (
          <>
            <SectionIntro
              title="Live"
              description="Go live with video, audio, or screen sharing — chat, reactions, gifts, and replays."
            />
            <GigaSocialPanelErrorBoundary panelName="Live">
              <GigaSocialLivePanel sessionToken={sessionToken} />
            </GigaSocialPanelErrorBoundary>
          </>
        )}

        {section === "creator" && (
          <>
            <SectionIntro
              title="Creator economy"
              description="Tips and ad boosts are open to every creator. Affiliate and payout tools unlock at 500 fans."
            />
            <GigaSocialPanelErrorBoundary panelName="Creator">
              <GigaSocialCreatorPanel sessionToken={sessionToken} />
            </GigaSocialPanelErrorBoundary>
          </>
        )}

        {section === "profile" && (
          <>
            <SectionIntro
              title="Your profile"
              description="Bio, skills, interests, achievements, XP, and shared posts."
            />
            <GigaSocialPanelErrorBoundary panelName="Profile">
              <GigaSocialProfilePanel sessionToken={sessionToken} />
            </GigaSocialPanelErrorBoundary>
          </>
        )}

        {section === "notifications" && (
          <>
            <SectionIntro
              title="Notifications"
              description="Likes, comments, replies, and community activity."
            />
            <GigaSocialPanelErrorBoundary panelName="Notifications">
              <GigaSocialNotificationsPanel sessionToken={sessionToken} />
            </GigaSocialPanelErrorBoundary>
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.links.creatorStudio} variant="outline" className="min-h-11">
          Creator Studio
        </ButtonLink>
        <ButtonLink href={siteConfig.links.dashboard} variant="outline" className="min-h-11">
          Open chat
        </ButtonLink>
      </div>
    </div>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

function GigaSocialClientInner() {
  return (
    <Suspense fallback={<p className="text-center text-muted">Loading GigaSocial…</p>}>
      <GigaSocialContent />
    </Suspense>
  );
}

export function GigaSocialClient() {
  return (
    <ConvexAppShell>
      <GigaSocialClientInner />
    </ConvexAppShell>
  );
}
