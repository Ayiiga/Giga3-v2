"use client";

import { DocumentStudio } from "@/components/documents/DocumentStudio";
import { Button } from "@/components/ui/Button";
import { listDocumentDrafts, saveDocumentDraft } from "@/lib/documents/drafts";
import { createDocumentFromTemplate, DOCUMENT_STUDIO_TEMPLATES } from "@/lib/documents/templates";
import type { GigaDocument } from "@/lib/documents/types";
import { useEffect, useState } from "react";

export function DocumentsPageRoot() {
  const [doc, setDoc] = useState<GigaDocument | null>(null);
  const [drafts, setDrafts] = useState<GigaDocument[]>([]);

  useEffect(() => {
    setDrafts(listDocumentDrafts());
  }, [doc?.updatedAt]);

  return (
    <div className="document-compact mx-auto max-w-3xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Shared across Chat · GigaLearn · Create</p>
        <h2 className="text-xl font-bold text-foreground">Document Studio</h2>
        <p className="text-sm text-muted">
          Rich-text editing with A4/A5 setup, one-page CV fit, and real PDF / Word export.
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Templates</h3>
        <div className="gigalearn-grade-scroll flex gap-2 overflow-x-auto pb-1">
          {DOCUMENT_STUDIO_TEMPLATES.map((t) => (
            <button
              key={`${t.kind}-${t.title}`}
              type="button"
              onClick={() => {
                const next = createDocumentFromTemplate(t.kind, t.title);
                setDoc(saveDocumentDraft(next));
              }}
              className="min-h-11 shrink-0 rounded-2xl border border-border bg-white px-3 py-2 text-left text-xs font-semibold"
            >
              <span className="block text-foreground">{t.title}</span>
              <span className="mt-0.5 block font-normal text-muted">{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      {drafts.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Saved drafts</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {drafts.slice(0, 6).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDoc(d)}
                  className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-white px-3 py-2 text-left text-sm"
                >
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="text-[11px] text-muted">{d.paper.size}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {doc ? (
        <DocumentStudio
          document={doc}
          onChange={(next) => {
            setDoc(next);
            saveDocumentDraft(next);
          }}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted">Choose a template or open a draft to start editing.</p>
          <Button
            type="button"
            className="mt-3 min-h-11"
            onClick={() => setDoc(saveDocumentDraft(createDocumentFromTemplate("cv")))}
          >
            Start Professional CV
          </Button>
        </div>
      )}
    </div>
  );
}
