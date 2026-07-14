"use client";

import { GigaSocialCommunitiesPanel } from "@/components/gigasocial/GigaSocialCommunitiesPanel";
import { GigaSocialDiscoverPanel } from "@/components/gigasocial/GigaSocialDiscoverPanel";
import { GigaSocialFeedPanel } from "@/components/gigasocial/GigaSocialFeedPanel";
import { GigaSocialLivePanel } from "@/components/gigasocial/live/GigaSocialLivePanel";
import { GigaSocialPanelErrorBoundary } from "@/components/gigasocial/GigaSocialPanelErrorBoundary";
import { GigaSocialNotificationsPanel } from "@/components/gigasocial/GigaSocialNotificationsPanel";
import { GigaSocialProfilePanel } from "@/components/gigasocial/GigaSocialProfilePanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { getSessionToken } from "@/lib/auth";
import { getGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import {
  GIGASOCIAL_SECTIONS,
  type GigaSocialSection,
} from "@/lib/gigasocial/sections";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, UsersRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

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

  const notifications = useQuery(
    api.gigaSocial.listNotifications,
    sessionToken ? { sessionToken, limit: 1 } : "skip"
  );
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

  const unread = notifications?.unreadCount ?? 0;
  const features = getGigaSocialFeatures();

  const openSection = (id: GigaSocialSection) => {
    setSection(id);
    if (id !== "feed") setCommunitySlug(undefined);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", id);
    router.replace(`/gigasocial/?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="gigasocial-stable gigasocial-pro mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={siteConfig.links.dashboard}
            className="mb-3 inline-flex min-h-9 items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to chat
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
              <UsersRound className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                GigaSocial
              </h1>
              <p className="text-sm text-muted">
                Connect, share, learn, and collaborate across the Giga3 AI community.
              </p>
            </div>
          </div>
        </div>
        {communitySlug && (
          <div className="saas-card rounded-2xl border border-border px-4 py-3 text-sm">
            Community feed: <span className="font-medium capitalize">{communitySlug}</span>
            <button
              type="button"
              className="ml-2 text-accent hover:underline"
              onClick={() => setCommunitySlug(undefined)}
            >
              Clear
            </button>
          </div>
        )}
      </header>

      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
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
                "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
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

      <section className="gigasocial-feed-shell rounded-2xl border border-border p-4 sm:p-6">
        {section === "feed" && (
          <>
            <SectionIntro
              title={communitySlug ? `Community: ${communitySlug}` : "Latest posts"}
              description={
                features.enableGigaCreate
                  ? "Newest community posts first — tap GigaCreate to share video, photos, learning content, and more."
                  : "Newest community posts first — tap the pen icon to share something."
              }
            />
            <GigaSocialPanelErrorBoundary panelName="Feed">
              <GigaSocialFeedPanel
                sessionToken={sessionToken}
                communitySlug={communitySlug}
                highlightPostId={highlightPostId}
                onOpenLive={features.enableGigaLive ? () => openSection("live") : undefined}
              />
            </GigaSocialPanelErrorBoundary>
          </>
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
