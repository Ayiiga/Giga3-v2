"use client";

import { CV_PALETTES } from "@/lib/documents/cvLayouts";
import { CvTemplateGallery } from "@/components/documents/CvTemplateGallery";
import { DocumentStudio } from "@/components/documents/DocumentStudio";
import { Button } from "@/components/ui/Button";
import { listDocumentDrafts, saveDocumentDraft } from "@/lib/documents/drafts";
import { createDocumentFromTemplate, DOCUMENT_STUDIO_TEMPLATES } from "@/lib/documents/templates";
import type { GigaDocument } from "@/lib/documents/types";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTOSAVE_DELAY_MS = 650;

export function DocumentsPageRoot() {
  const [doc, setDoc] = useState<GigaDocument | null>(null);
  const [viewDraft, setViewDraft] = useState(false);
  const [openVersion, setOpenVersion] = useState(0);
  const [editProfile, setEditProfile] = useState(false);
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
    const localDrafts = listDocumentDrafts();
    setDrafts(localDrafts);
    const draftId = new URLSearchParams(window.location.search).get("draft");
    const selected = localDrafts.find(item => item.id === draftId);
    if (selected) {
      setDoc(selected);
      setEditProfile(selected.templateKind === "cv");
      requestAnimationFrame(() => document.getElementById("active-document")?.scrollIntoView({ block: "start" }));
    }
    const onPageHide = () => persistPending(false);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      persistPending(false);
    };
  }, [persistPending]);

  const openDocument = (next: GigaDocument, needsSave: boolean, preview = false) => {
    const latest = pendingDraft.current?.id === next.id ? pendingDraft.current : next;
    persistPending();
    if (needsSave) {
      try {
        saveDocumentDraft(latest);
        setSaveError(null);
      } catch {
        setSaveError("This device could not save the draft. Export a Word or PDF copy before leaving.");
      }
    }
    setOpenVersion((version) => version + 1);
    setViewDraft(preview);
    setEditProfile(!needsSave && !preview && next.templateKind === "cv");
    setDoc(latest);
    setDrafts(listDocumentDrafts());
    requestAnimationFrame(() => document.getElementById("active-document")?.scrollIntoView({ block: "start" }));
  };

  const onDocumentChange = (next: GigaDocument) => {
    setDoc(next);
    pendingDraft.current = next;
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistPending(), AUTOSAVE_DELAY_MS);
  };

  return (
    <div className="document-compact mx-auto w-full min-w-0 max-w-3xl space-y-4">
      <header className="studio-banner space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Shared across Chat · GigaLearn · Create</p>
        <h2 className="text-xl font-bold text-foreground">Document Studio</h2>
        <p className="text-sm text-muted">
          Choose a design, add your details and download a PDF or Word copy.
        </p>
      </header>

      {saveError ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="alert">
          {saveError}
        </p>
      ) : null}

      <section id="template-library" className="space-y-3">
        <h3 className="text-lg font-bold">Choose a template</h3>
        <div className="studio-shelf">
          <a className="studio-tile" data-palette="cv" href="#cv-template-heading">
            <span className="studio-cover" aria-hidden="true"><b>Curriculum vitae</b><i>Professional profile</i></span>
            <strong>CV layouts</strong>
          </a>
          {DOCUMENT_STUDIO_TEMPLATES.filter(t => t.design).map(t => (
            <button key={t.title} className="studio-tile" data-palette={t.kind} type="button"
              onClick={() => openDocument(createDocumentFromTemplate(t.kind, t.title), true)}>
              <span className="studio-cover" aria-hidden="true"><b>{t.markdown.split("\n")[0].slice(2)}</b><i>{t.kind === "poster" ? "Music · Dance · Theatre" : t.kind === "flyer" ? "Hands-on learning" : "Application letter"}</i></span>
              <strong>{t.title}</strong>
            </button>
          ))}
        </div>
      </section>

      <CvTemplateGallery onChoose={(cvLayout) => {
        openDocument({
          ...createDocumentFromTemplate("cv"),
          cvLayout,
          cvAccent: CV_PALETTES[cvLayout],
        }, true);
      }} />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Document templates</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOCUMENT_STUDIO_TEMPLATES.filter(t => !t.design).map((t) => (
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
            {drafts.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-white px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {d.templateKind === "cv" && d.profilePhotoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.profilePhotoDataUrl} alt="" width={32} height={40} className="h-10 w-8 rounded object-cover" />
                  ) : null}
                  <span className="min-w-0 flex-1 break-words text-sm font-medium">{d.title}</span>
                  <span className="text-xs text-muted">{d.paper.size}</span>
                </div>
                <div className="mt-1 flex gap-2">
                  <Button type="button" size="sm" variant="secondary" aria-label={`Edit ${d.title}`} onClick={() => openDocument(d, false)}>Edit</Button>
                  {d.templateKind === "cv" ? (
                    <Button type="button" size="sm" variant="secondary" aria-label={`View CV ${d.title}`} onClick={() => openDocument(d, false, true)}>View CV</Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {doc ? (
        <div id="active-document" className="scroll-mt-24">
          <DocumentStudio key={openVersion} document={doc} onChange={onDocumentChange} initialPreview={viewDraft} initialProfile={editProfile} />
        </div>
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
