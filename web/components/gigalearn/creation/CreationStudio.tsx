"use client";

import { CreationBuilder, type BuilderStep } from "@/components/gigalearn/creation/CreationBuilder";
import {
  ReferenceStructurePanel,
  type ReferenceStart,
} from "@/components/gigalearn/creation/ReferenceStructurePanel";
import { useBackToClose } from "@/hooks/useBackToClose";
import { deleteCreationDraft, listCreationDrafts } from "@/lib/gigalearn/creation/drafts";
import { formatValue, missingRequired, withDefaults } from "@/lib/gigalearn/creation/intake";
import { consumeCreationAutostart, parseCreationLink } from "@/lib/gigalearn/creation/links";
import { CREATION_TEMPLATES, getCreationTemplate, stagesFor } from "@/lib/gigalearn/creation/templates";
import type { CreationDraft, CreationTemplateId } from "@/lib/gigalearn/creation/types";
import { FileSearch, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ActiveBuilder = {
  key: number;
  templateId: CreationTemplateId;
  initialInputs?: ReferenceStart["inputs"];
  initialStep?: BuilderStep;
  initialDraft?: CreationDraft;
  sourceReferences?: ReferenceStart["sourceReferences"];
  autostart?: boolean;
};

type View = { kind: "library" } | { kind: "reference" } | ({ kind: "builder" } & ActiveBuilder);

type CreationStudioProps = {
  credits: number | null;
  onOpenRhymes?: () => void;
};

export function CreationStudio({ credits, onOpenRhymes }: CreationStudioProps) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<View>({ kind: "library" });
  const [drafts, setDrafts] = useState<CreationDraft[]>([]);
  useBackToClose(view.kind !== "library", () => setView({ kind: "library" }));

  useEffect(() => {
    setDrafts(listCreationDrafts());
  }, [view.kind]);

  const query = params.toString();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const link = parseCreationLink(new URLSearchParams(query));
    if (!link) return;
    const template = getCreationTemplate(link.templateId)!;
    const confirmed = withDefaults(template, link.inputs);
    const complete = missingRequired(template, confirmed).length === 0;
    const step: BuilderStep = link.step === "edit" ? "edit" : link.step === "confirm" && complete ? "confirm" : "intake";
    setView({
      kind: "builder",
      key: Date.now(),
      templateId: link.templateId,
      initialInputs: step === "intake" ? link.inputs : confirmed,
      initialStep: step,
      autostart: step === "confirm" && consumeCreationAutostart(link.templateId),
    });
    // Drop the prefilled fields from the address bar so a refresh doesn't restart the flow.
    routerRef.current.replace(`${pathname}?tab=create`, { scroll: false });
  }, [query, pathname]);

  const openTemplate = (templateId: CreationTemplateId) => {
    setView({ kind: "builder", key: Date.now(), templateId });
  };

  if (view.kind === "reference") {
    return (
      <ReferenceStructurePanel
        onBack={() => setView({ kind: "library" })}
        onStart={(start) =>
          setView({
            kind: "builder",
            key: Date.now(),
            templateId: start.templateId,
            initialInputs: start.inputs,
            sourceReferences: start.sourceReferences,
          })
        }
      />
    );
  }

  if (view.kind === "builder") {
    const template = getCreationTemplate(view.templateId)!;
    return (
      <CreationBuilder
        key={view.key}
        template={template}
        initialInputs={view.initialInputs}
        initialStep={view.initialStep}
        initialDraft={view.initialDraft ?? null}
        extraSourceReferences={view.sourceReferences}
        autostart={view.autostart}
        credits={credits}
        onExit={() => setView({ kind: "library" })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Template library</h3>
        <p className="mt-1 text-sm text-muted">
          Giga3 asks a few questions, shows you a summary to confirm, then writes original content — never before you
          confirm.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CREATION_TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => openTemplate(template.id)}
              className="flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-2xl border border-border bg-white p-4 text-left hover:border-accent/40"
            >
              <span className="text-2xl" aria-hidden>
                {template.emoji}
              </span>
              <span className="text-sm font-semibold text-foreground">{template.label}</span>
              <span className="text-xs text-muted">{template.tagline}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setView({ kind: "reference" })}
            className="flex h-full min-h-24 w-full flex-col items-start gap-1 rounded-2xl border border-dashed border-border bg-white p-4 text-left hover:border-accent/40"
          >
            <FileSearch className="h-6 w-6 text-accent" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Start from a reference</span>
            <span className="text-xs text-muted">Reuse a document&apos;s structure — never its wording.</span>
          </button>
        </li>
      </ul>

      {onOpenRhymes ? (
        <p className="text-sm text-muted">
          Looking for ready-made rhymes?{" "}
          <button type="button" onClick={onOpenRhymes} className="min-h-11 font-medium text-accent hover:underline">
            Open GigaRhymes
          </button>
        </p>
      ) : null}

      {drafts.length ? (
        <div>
          <h3 className="text-base font-semibold text-foreground">Saved drafts</h3>
          <p className="mt-1 text-xs text-muted">Stored on this device only.</p>
          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {drafts.map((draft) => {
              const template = getCreationTemplate(draft.templateId);
              if (!template) return null;
              const total = stagesFor(template, draft.inputs).length;
              const title =
                formatValue(draft.inputs.title ?? draft.inputs.topic ?? draft.inputs.professionalTitle) ||
                template.documentNoun;
              return (
                <li key={draft.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setView({ kind: "builder", key: Date.now(), templateId: draft.templateId, initialDraft: draft })
                    }
                    className="flex min-h-11 flex-1 flex-col items-start text-left"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {template.emoji} {title}
                    </span>
                    <span className="text-xs text-muted">
                      {template.label} · {draft.sections.filter(Boolean).length} of {total} stages ·{" "}
                      {new Date(draft.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete draft ${title}`}
                    onClick={() => {
                      deleteCreationDraft(draft.id);
                      setDrafts(listCreationDrafts());
                    }}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
