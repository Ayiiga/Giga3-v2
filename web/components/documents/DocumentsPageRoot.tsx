"use client";

import { DocumentStudio } from "@/components/documents/DocumentStudio";
import { Button } from "@/components/ui/Button";
import { listDocumentDrafts, saveDocumentDraft } from "@/lib/documents/drafts";
import { createDocumentFromTemplate, DOCUMENT_STUDIO_TEMPLATES } from "@/lib/documents/templates";
import type { GigaDocument } from "@/lib/documents/types";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 650;

export function DocumentsPageRoot() {
  const [doc, setDoc] = useState<GigaDocument | null>(null);
  const [drafts, setDrafts] = useState<GigaDocument[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingDraft = useRef<GigaDocument | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editing on Android must not synchronously stringify many drafts on every
  // keystroke. Flush at an idle point, when switching documents, and on pagehide.
  const persistPending = useCallback((updateUi = true) => {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const pending = pendingDraft.current;
    pendingDraft.current = null;
    if (!pending) return;
    try {
      saveDocumentDraft(pending);
      if (updateUi) {
        setDrafts(listDocumentDrafts());
        setSaveError(null);
      }
    } catch {
      if (updateUi) {
        setSaveError("This device could not save the draft. Export a Word or PDF copy before leaving.");
      }
    }
  }, []);

  useEffect(() => {
    setDrafts(listDocumentDrafts());
    const onPageHide = () => persistPending(false);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      persistPending(false);
    };
  }, [persistPending]);

  const openDocument = (next: GigaDocument, needsSave: boolean) => {
    persistPending();
    if (needsSave) {
      try {
        saveDocumentDraft(next);
        setSaveError(null);
      } catch {
        setSaveError("This device could not save the draft. Export a Word or PDF copy before leaving.");
      }
    }
    setDoc(next);
    setDrafts(listDocumentDrafts());
  };

  const onDocumentChange = (next: GigaDocument) => {
    setDoc(next);
    pendingDraft.current = next;
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistPending(), AUTOSAVE_DELAY_MS);
  };

  return (
    <div className="document-compact mx-auto w-full min-w-0 max-w-3xl space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Shared across Chat · GigaLearn · Create</p>
        <h2 className="text-xl font-bold text-foreground">Document Studio</h2>
        <p className="text-sm text-muted">
          Rich-text editing, professional one- or two-page CV targets, optional portrait photos, and PDF / Word / PowerPoint exports.
        </p>
      </header>

      {saveError ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
          {saveError}
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Templates</h3>
        <div className="gigalearn-grade-scroll flex gap-2 overflow-x-auto pb-1">
          {DOCUMENT_STUDIO_TEMPLATES.map((t) => (
            <button
              key={`${t.kind}-${t.title}`}
              type="button"
              onClick={() => openDocument(createDocumentFromTemplate(t.kind, t.title), true)}
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
                  onClick={() => openDocument(d, false)}
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
        <DocumentStudio document={doc} onChange={onDocumentChange} />
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted">Choose a template or open a draft to start editing.</p>
          <Button
            type="button"
            className="mt-3 min-h-11"
            onClick={() => openDocument(createDocumentFromTemplate("cv"), true)}
          >
            Start Professional CV
          </Button>
        </div>
      )}
    </div>
  );
}
