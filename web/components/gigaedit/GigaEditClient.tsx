"use client";

import { AiCreatorAssistant } from "@/components/gigaedit/AiCreatorAssistant";
import { AudioStudio } from "@/components/gigaedit/AudioStudio";
import { BrandKitPanel } from "@/components/gigaedit/BrandKitPanel";
import { EditorShell } from "@/components/gigaedit/EditorShell";
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
import type { ExportAspectRatio, GigaEditOpenOptions, GigaEditSection } from "@/lib/gigaedit/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const VALID_SECTIONS = new Set<GigaEditSection>([
  "home",
  "video",
  "photo",
  "teleprompter",
  "script",
  "templates",
  "audio",
  "social",
  "projects",
  "ai",
  "brand",
]);

const ASPECTS = new Set<ExportAspectRatio>(["9:16", "16:9", "1:1", "4:5", "4:3"]);

function parseSection(raw: string | null): GigaEditSection {
  if (!raw) return "home";
  if (VALID_SECTIONS.has(raw as GigaEditSection)) return raw as GigaEditSection;
  return "home";
}

function parseAspect(raw: string | null): ExportAspectRatio | null {
  if (!raw) return null;
  return ASPECTS.has(raw as ExportAspectRatio) ? (raw as ExportAspectRatio) : null;
}

function parseBool(raw: string | null): boolean {
  return raw === "1" || raw === "true";
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
  const autoImport = useMemo(
    () => parseBool(searchParams?.get("import") ?? null),
    [searchParams]
  );
  const focusRecord = useMemo(
    () => parseBool(searchParams?.get("record") ?? null),
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
        params.delete("import");
        params.delete("record");
      } else {
        params.set("tab", next);
        if (opts?.projectId) params.set("project", opts.projectId);
        else params.delete("project");
        if (opts?.aspect) params.set("aspect", opts.aspect);
        else if (!opts?.projectId) params.delete("aspect");
        if (opts?.autoImport) params.set("import", "1");
        else params.delete("import");
        if (opts?.record) params.set("record", "1");
        else params.delete("record");
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
    <EditorShell
      section={section}
      onBackHome={() => openSection("home")}
      footer={
        <GigaEditBottomNav activeSection={section} onOpenSection={(s) => openSection(s)} />
      }
    >
      {section === "home" && <GigaEditHome onOpen={openSection} />}
      {section === "video" && (
        <VideoEditor
          initialProjectId={projectId}
          initialAspect={aspect}
          autoImport={autoImport}
        />
      )}
      {section === "photo" && (
        <PhotoEditor
          initialProjectId={projectId}
          initialAspect={aspect}
          autoImport={autoImport}
        />
      )}
      {section === "teleprompter" && (
        <TeleprompterStudio focusRecord={focusRecord} autoOpenCamera />
      )}
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
      {section === "audio" && <AudioStudio focusRecord={focusRecord} />}
      {section === "social" && <SocialMediaCreator />}
      {section === "brand" && <BrandKitPanel />}
      {section === "projects" && (
        <div className="space-y-4">
          <ProjectManager onOpen={openSection} />
          {features.enableGigaEditOffline ? <OfflineManager /> : null}
        </div>
      )}
    </EditorShell>
  );
}
