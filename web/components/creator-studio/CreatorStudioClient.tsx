"use client";

import { CreatorTemplatePicker } from "@/components/creator-studio/CreatorTemplatePicker";
import { CreatorImagePanel } from "@/components/creator-studio/CreatorImagePanel";
import { CreatorTextToolPanel } from "@/components/creator-studio/CreatorTextToolPanel";
import { CreatorWorkspacePanel } from "@/components/creator-studio/CreatorWorkspacePanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useMediaBilling } from "@/hooks/useMediaBilling";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import {
  CREATOR_SECTIONS,
  type CreatorStudioSection,
} from "@/lib/creator-studio/sections";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_TOOLS,
  WRITING_TOOLS,
} from "@/lib/creator-studio/tools";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ArrowLeft, Palette } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CreatorStudioContent() {
  useRenderDiagnostic("CreatorStudioContent");

  const router = useRouter();
  const params = useSearchParams();
  const { email, usage, mounted } = useMediaBilling();
  const initialTab = (params.get("tab") as CreatorStudioSection) || "writing";
  const [section, setSection] = useState<CreatorStudioSection>(
    CREATOR_SECTIONS.some((s) => s.id === initialTab) ? initialTab : "writing"
  );

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/creator-studio");
  }, [email, router]);

  useEffect(() => {
    const tab = params.get("tab") as CreatorStudioSection;
    if (tab && CREATOR_SECTIONS.some((s) => s.id === tab)) {
      setSection(tab);
    }
  }, [params]);

  if (!email) {
    return <p className="text-center text-base text-muted">Redirecting…</p>;
  }

  return (
    <div className="creator-studio-stable mx-auto max-w-6xl space-y-8">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Palette className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Creator Studio
              </h1>
              <p className="text-sm text-muted">
                AI writing, images, and social tools — built for African creators.
              </p>
            </div>
          </div>
        </div>
        <div className="saas-card rounded-2xl border border-border px-4 py-3 text-right">
          <p className="text-xs text-muted">Credits</p>
          <p className="text-xl font-semibold text-foreground">{usage?.credits ?? "—"}</p>
          <Link href={siteConfig.links.credits} className="text-xs text-accent hover:underline">
            Get more
          </Link>
        </div>
      </header>

      <CreatorTemplatePicker
        onSelectWriting={(template) => {
          if (template.tab === "social") {
            setSection("social");
          } else {
            setSection("writing");
          }
        }}
      />

      <nav
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
        aria-label="Creator Studio sections"
      >
        {CREATOR_SECTIONS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                active
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-border bg-white text-muted hover:border-accent/25"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>

      <section className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        {section === "writing" && (
          <>
            <SectionIntro
              title="AI Writing Tools"
              description="Generate captions, posts, articles, speeches, emails, and CV content."
            />
            <CreatorTextToolPanel
              tools={WRITING_TOOLS}
              kind="writing"
              credits={usage?.credits ?? null}
            />
          </>
        )}

        {section === "image" && (
          <>
            <SectionIntro
              title="AI Image Tools"
              description="Create posters, logos, social graphics, and educational visuals."
            />
            <CreatorImagePanel usage={usage} email={email} mounted={mounted} />
          </>
        )}

        {section === "social" && (
          <>
            <SectionIntro
              title="Social Media Assistant"
              description="Hooks, hashtags, viral captions, and post improvements for every major platform."
            />
            <CreatorTextToolPanel
              tools={SOCIAL_TOOLS}
              kind="social"
              credits={usage?.credits ?? null}
              platformOptions={SOCIAL_PLATFORMS}
            />
          </>
        )}

        {section === "workspace" && (
          <>
            <SectionIntro
              title="Creator Workspace"
              description="Recent creations, favorites, prompt history, and usage tracking."
            />
            <CreatorWorkspacePanel />
          </>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={siteConfig.links.media} variant="outline" className="min-h-11">
          Open Media Studio
        </ButtonLink>
        <ButtonLink href="/marketplace/sell/" variant="outline" className="min-h-11">
          Creator dashboard
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

function CreatorStudioClientInner() {
  return (
    <Suspense fallback={<p className="text-center text-muted">Loading Creator Studio…</p>}>
      <CreatorStudioContent />
    </Suspense>
  );
}

export function CreatorStudioClient() {
  return (
    <ConvexAppShell>
      <CreatorStudioClientInner />
    </ConvexAppShell>
  );
}
