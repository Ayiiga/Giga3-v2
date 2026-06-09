"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { MediaErrorBoundary } from "@/components/media/MediaErrorBoundary";
import { MediaGeneratePanel } from "@/components/media/MediaGeneratePanel";
import { MediaQuickTemplates } from "@/components/media/MediaQuickTemplates";
import { MediaStudioHeader } from "@/components/media/MediaStudioHeader";
import { RecentGenerationsSection } from "@/components/media/RecentGenerationsSection";
import { useMediaBilling } from "@/hooks/useMediaBilling";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import {
  getImageStudioActionPrompt,
  parseImageStudioActionId,
} from "@/lib/chat/imageStudioLinks";
import { getMediaStudioTemplate } from "@/lib/media/studioTemplates";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

type FormSeed = {
  tab: "image" | "video";
  category: string;
  prompt: string;
  action: ReturnType<typeof parseImageStudioActionId>;
};

function MediaStudioContent() {
  useRenderDiagnostic("MediaStudioContent");

  const router = useRouter();
  const params = useSearchParams();
  const { email, usage, mounted } = useMediaBilling();

  const initialTab = params.get("tab") === "video" ? "video" : "image";
  const initialCategory = params.get("category") ?? "anime_art";
  const initialAction = parseImageStudioActionId(params.get("action"));
  const initialPrompt =
    params.get("prompt") ??
    (initialAction ? getImageStudioActionPrompt(initialAction) : "");
  const initialSourceImageUrl = params.get("source") ?? "";

  const [formRevision, setFormRevision] = useState(0);
  const [formSeed, setFormSeed] = useState<FormSeed>({
    tab: initialTab,
    category: initialCategory,
    prompt: initialPrompt,
    action: initialAction,
  });

  useEffect(() => {
    if (!email) router.replace("/chat/login?next=/media");
  }, [email, router]);

  useEffect(() => {
    const templateId = params.get("template");
    if (!templateId) return;
    const template = getMediaStudioTemplate(templateId);
    if (!template) return;
    setFormSeed({
      tab: template.tab,
      category: template.category,
      prompt: template.prompt,
      action: null,
    });
    setFormRevision((r) => r + 1);
  }, [params]);

  useEffect(() => {
    const action = parseImageStudioActionId(params.get("action"));
    const tab = params.get("tab") === "video" ? "video" : "image";
    const category = params.get("category") ?? "anime_art";
    const promptParam = params.get("prompt");
    const hasSource = Boolean(params.get("source"));
    if (!action && !promptParam && !hasSource) return;
    const prompt =
      promptParam ?? (action ? getImageStudioActionPrompt(action) : "");
    setFormSeed({ tab, category, prompt, action });
    setFormRevision((r) => r + 1);
  }, [params]);

  if (!email) {
    return <p className="text-center text-base text-muted">Redirecting…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <MediaStudioHeader usage={usage} />

      <MediaQuickTemplates
        onApply={(template) => {
          setFormSeed({ ...template, action: null });
          setFormRevision((r) => r + 1);
        }}
      />

      <MediaGeneratePanel
        key={formRevision}
        usage={usage}
        initialTab={formSeed.tab}
        initialCategory={formSeed.category}
        initialPrompt={formSeed.prompt}
        initialSourceImageUrl={initialSourceImageUrl}
        initialAction={formSeed.action}
      />

      <RecentGenerationsSection userId={email} mounted={mounted} />
    </div>
  );
}

function MediaStudioClientInner() {
  return (
    <Suspense fallback={<p className="text-center text-base text-muted">Loading studio…</p>}>
      <MediaStudioContent />
    </Suspense>
  );
}

export function MediaStudioClient() {
  return (
    <ConvexAppShell>
      <MediaErrorBoundary>
        <MediaStudioClientInner />
      </MediaErrorBoundary>
    </ConvexAppShell>
  );
}
