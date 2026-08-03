"use client";

import { AiCreatorAssistant } from "@/components/gigaedit/AiCreatorAssistant";
import { AudioStudio } from "@/components/gigaedit/AudioStudio";
import { GigaEditBottomNav } from "@/components/gigaedit/GigaEditBottomNav";
import { GigaEditHome } from "@/components/gigaedit/GigaEditHome";
import { OfflineManager } from "@/components/gigaedit/OfflineManager";
import { PhotoEditor } from "@/components/gigaedit/PhotoEditor";
import { ProjectManager } from "@/components/gigaedit/ProjectManager";
import { SocialMediaCreator } from "@/components/gigaedit/SocialMediaCreator";
import { TeleprompterStudio } from "@/components/gigaedit/TeleprompterStudio";
import { TemplateGallery } from "@/components/gigaedit/TemplateGallery";
import { VideoEditor } from "@/components/gigaedit/VideoEditor";
import { useGigaEditFeatures } from "@/lib/gigaedit/featureFlags";
import { startGigaEditBackgroundSync } from "@/lib/gigaedit/offline";
import type {
  ExportAspectRatio,
  GigaEditOpenOptions,
  GigaEditSection,
} from "@/lib/gigaedit/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const SECTION_LABELS: Record<GigaEditSection, string> = {
  home: "Home",
  video: "Video",
  photo: "Photo",
  teleprompter: "Teleprompter",
  script: "AI Script",
  templates: "Templates",
  audio: "Audio",
  social: "Social",
  projects: "Projects",
  ai: "AI Assist",
};

const ASPECTS = new Set<ExportAspectRatio>(["9:16", "16:9", "1:1", "4:5", "4:3"]);

function parseSection(raw: string | null): GigaEditSection {
  if (!raw) return "home";
  if (raw in SECTION_LABELS) return raw as GigaEditSection;
  return "home";
}

function parseAspect(raw: string | null): ExportAspectRatio | null {
  if (!raw) return null;
  return ASPECTS.has(raw as ExportAspectRatio) ? (raw as ExportAspectRatio) : null;
}

export function GigaEditClient() {
  const features = useGigaEditFeatures();
  const searchParams = useSearchParams();
  const router = useRouter();
  const section = useMemo(
    () => parseSection(searchParams?.get("tab") ?? searchParams?.get("tool")),
    [searchParams]
  );
  const projectId = searchParams?.get("project") ?? null;
  const aspect = useMemo(
    () => parseAspect(searchParams?.get("aspect") ?? null),
    [searchParams]
  );

  const openSection = useCallback(
    (next: GigaEditSection, opts?: GigaEditOpenOptions) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next === "home") {
        params.delete("tab");
        params.delete("tool");
        params.delete("project");
        params.delete("aspect");
      } else {
        params.set("tab", next);
        if (opts?.projectId) params.set("project", opts.projectId);
        else params.delete("project");
        if (opts?.aspect) params.set("aspect", opts.aspect);
        else if (!opts?.projectId) params.delete("aspect");
      }
      const qs = params.toString();
      router.replace(qs ? `/gigaedit/?${qs}` : "/gigaedit/", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (!features.enableGigaEditOffline) return;
    return startGigaEditBackgroundSync();
  }, [features.enableGigaEditOffline]);

  if (!features.enableGigaEdit) {
    return (
      <div className="gigaedit-shell rounded-2xl p-6 text-sm text-[var(--ge-muted)]">
        GigaEdit is disabled. Set <code className="text-[var(--ge-gold)]">enableGigaEdit</code> to
        true or remove the localStorage override.
      </div>
    );
  }

  return (
    <div className="gigaedit-shell gigaedit-stable mx-auto max-w-5xl rounded-2xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {section !== "home" ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ge-border)] text-[var(--ge-muted)]"
              aria-label="Back to GigaEdit home"
              onClick={() => openSection("home")}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ge-gold)]">
              🎬 GigaEdit
            </p>
            <p className="text-xs text-[var(--ge-muted)]">{SECTION_LABELS[section]}</p>
          </div>
        </div>
        <Link
          href="/media/"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-1.5 text-[11px] text-[var(--ge-muted)]"
        >
          AI Studio
        </Link>
      </div>

      {section === "home" && <GigaEditHome onOpen={openSection} />}
      {section === "video" && (
        <VideoEditor initialProjectId={projectId} initialAspect={aspect} />
      )}
      {section === "photo" && (
        <PhotoEditor initialProjectId={projectId} initialAspect={aspect} />
      )}
      {section === "teleprompter" && <TeleprompterStudio />}
      {section === "script" && features.enableGigaEditAiAssist ? (
        <AiCreatorAssistant />
      ) : null}
      {section === "script" && !features.enableGigaEditAiAssist ? (
        <p className="text-sm text-[var(--ge-muted)]">AI Script assist is disabled.</p>
      ) : null}
      {section === "ai" && features.enableGigaEditAiAssist ? <AiCreatorAssistant /> : null}
      {section === "ai" && !features.enableGigaEditAiAssist ? (
        <p className="text-sm text-[var(--ge-muted)]">AI Assist is disabled.</p>
      ) : null}
      {section === "templates" && (
        <TemplateGallery
          onUseVideo={(opts) => openSection("video", opts)}
          onUsePhoto={(opts) => openSection("photo", opts)}
        />
      )}
      {section === "audio" && <AudioStudio />}
      {section === "social" && <SocialMediaCreator />}
      {section === "projects" && (
        <div className="space-y-4">
          <ProjectManager onOpen={openSection} />
          {features.enableGigaEditOffline ? <OfflineManager /> : null}
        </div>
      )}

      <GigaEditBottomNav activeSection={section} onOpenSection={openSection} />
    </div>
  );
}
