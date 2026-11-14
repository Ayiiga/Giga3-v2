"use client";

import { DocumentToolbar } from "@/components/documents/DocumentToolbar";
import { Button } from "@/components/ui/Button";
import { saveDocumentDraft } from "@/lib/documents/drafts";
import { downloadDocumentExport, shareDocumentFile } from "@/lib/documents/download";
import {
  evaluateOnePageFit,
  markdownToEditorHtml,
  tipTapJsonToMarkdown,
} from "@/lib/documents/model";
import { previewPageCss } from "@/lib/documents/paper";
import { preparePassportPhoto } from "@/lib/documents/profilePhoto";
import {
  analyzePdfUnicodeCoverage,
  PDF_UNICODE_LIMITATION,
} from "@/lib/documents/pdfUnicode";
import type { DocJson, DocPaperSize, GigaDocument } from "@/lib/documents/types";
import { cn } from "@/lib/utils";
import { FontSize } from "@/lib/documents/fontSize";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { FileDown, Loader2, Maximize2, Save, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type DocumentStudioProps = {
  document: GigaDocument;
  onChange?: (doc: GigaDocument) => void;
  onRegenerate?: () => void;
  compact?: boolean;
  className?: string;
};

export function DocumentStudio({
  document: initial,
  onChange,
  onRegenerate,
  compact = true,
  className,
}: DocumentStudioProps) {
  const [doc, setDoc] = useState(initial);
  const [busy, setBusy] = useState<"pdf" | "docx" | "pptx" | "share" | "save" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  /** Explicit user consent required before PDF export substitutes unsupported glyphs. */
  const [pdfUnicodeConfirm, setPdfUnicodeConfirm] = useState(false);

  const emit = useCallback(
    (next: GigaDocument) => {
      const withFit = { ...next, fitWarning: evaluateOnePageFit(next) };
      setDoc(withFit);
      onChange?.(withFit);
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: "Edit your document…" }),
    ],
    content: markdownToEditorHtml(initial.markdown),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[16rem] focus:outline-none text-foreground [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-zinc-300 [&_th]:bg-zinc-50 [&_th]:px-2 [&_th]:py-1",
      },
      transformPastedHTML(html) {
        // Strip scripts/event handlers from pasted HTML before TipTap ingests it.
        return html
          .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
          .replace(/\son\w+="[^"]*"/gi, "")
          .replace(/\son\w+='[^']*'/gi, "")
          .replace(/javascript:/gi, "");
      },
    },
    onUpdate: ({ editor: ed }) => {
      const content = ed.getJSON() as DocJson;
      const markdown = tipTapJsonToMarkdown(content);
      setDoc((prev) => {
        const next = {
          ...prev,
          content,
          markdown,
          updatedAt: Date.now(),
          fitWarning: evaluateOnePageFit({ ...prev, markdown }),
        };
        onChange?.(next);
        return next;
      });
    },
  });

  useEffect(() => {
    setDoc(initial);
    if (editor && initial.markdown !== tipTapJsonToMarkdown(editor.getJSON() as DocJson)) {
      editor.commands.setContent(markdownToEditorHtml(initial.markdown), false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when document id changes
  }, [initial.id]);

  const preview = previewPageCss(doc.paper, compact ? 360 : 720);

  const pdfUnicode = useMemo(
    () => analyzePdfUnicodeCoverage(doc.markdown),
    [doc.markdown]
  );

  async function runExport(kind: "pdf" | "docx" | "pptx", opts?: { acknowledgePdfUnicode?: boolean }) {
    const latest = {
      ...doc,
      content: (editor?.getJSON() as DocJson) ?? doc.content,
      markdown: editor ? tipTapJsonToMarkdown(editor.getJSON() as DocJson) : doc.markdown,
    };
    const coverage = analyzePdfUnicodeCoverage(latest.markdown);

    if (kind === "pdf" && coverage.hasUnsupported && !opts?.acknowledgePdfUnicode) {
      setPdfUnicodeConfirm(true);
      setStatus(null);
      setError(null);
      return;
    }

    setBusy(kind);
    setError(null);
    setStatus(null);
    setPdfUnicodeConfirm(false);
    try {
      const result = await downloadDocumentExport(latest, kind);
      if (kind === "pdf") {
        const count = result.pageCount ?? 1;
        const countLabel = `${count} page${count === 1 ? "" : "s"}`;
        const fitLabel = result.pageTargetExceeded
          ? " This exceeds your CV page target; shorten the content or choose two pages. No content was removed."
          : "";
        const unicodeLabel = result.pdfUnicode
          ? ` ${result.pdfUnicode.substitutedCount} unsupported character(s) became “?” (e.g. ${result.pdfUnicode.samples.join(" ")}). Export Word to preserve all characters.`
          : "";
        setStatus(`PDF ready — ${result.filename} (${countLabel}).${fitLabel}${unicodeLabel}`);
      } else if (kind === "pptx") {
        setStatus(`Editable PowerPoint slides ready — ${result.filename}. Review layout in your presentation app before sharing.`);
      } else {
        setStatus(`Word file ready — ${result.filename}. Pagination may differ between Word viewers.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    setBusy("save");
    setError(null);
    try {
      const latest = {
        ...doc,
        content: (editor?.getJSON() as DocJson) ?? doc.content,
        markdown: editor ? tipTapJsonToMarkdown(editor.getJSON() as DocJson) : doc.markdown,
      };
      const saved = saveDocumentDraft(latest);
      emit(saved);
      setStatus("Draft saved on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save draft.");
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setBusy("share");
    setError(null);
    try {
      const latest = {
        ...doc,
        content: (editor?.getJSON() as DocJson) ?? doc.content,
        markdown: editor ? tipTapJsonToMarkdown(editor.getJSON() as DocJson) : doc.markdown,
      };
      const result = await shareDocumentFile(latest, "pdf");
      setStatus(result === "shared" ? "Shared." : "Downloaded for sharing.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handlePhotoSelected(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const photo = await preparePassportPhoto(file);
      emit({ ...doc, profilePhotoDataUrl: photo, updatedAt: Date.now() });
      setStatus("Passport photo added for this CV. Export to include it in PDF or Word.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const shell = (
    <div
      className={cn(
        "document-studio space-y-3 rounded-2xl border border-border bg-white p-3 shadow-sm sm:p-4",
        fullscreen && "fixed inset-0 z-[80] overflow-y-auto rounded-none p-3 pb-[calc(var(--primary-nav-offset,0px)+1rem)]",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <label className="sr-only" htmlFor={`doc-title-${doc.id}`}>
            Document title
          </label>
          <input
            id={`doc-title-${doc.id}`}
            value={doc.title}
            onChange={(e) => emit({ ...doc, title: e.target.value })}
            className="w-full min-w-0 border-0 bg-transparent text-base font-bold text-foreground outline-none focus:ring-0"
          />
          <p className="text-[11px] font-medium uppercase tracking-wide text-accent">
            {doc.templateKind.replace(/-/g, " ")} · {doc.paper.size} · {doc.paper.orientation}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium"
          onClick={() => setFullscreen((v) => !v)}
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden />
          {fullscreen ? "Exit" : "Full screen"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium">
          Size
          <select
            value={doc.paper.size}
            onChange={(e) =>
              emit({
                ...doc,
                paper: { ...doc.paper, size: e.target.value as DocPaperSize },
              })
            }
            className="bg-transparent outline-none"
          >
            <option value="A4">A4</option>
            <option value="A5">A5</option>
          </select>
        </label>
        <label className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-2 text-xs font-medium">
          Orient
          <select
            value={doc.paper.orientation}
            onChange={(e) =>
              emit({
                ...doc,
                paper: {
                  ...doc.paper,
                  orientation: e.target.value as "portrait" | "landscape",
                },
              })
            }
            className="bg-transparent outline-none"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        {doc.templateKind === "cv" ? (
          <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-2 text-xs font-medium">
            CV length
            <select
              aria-label="Preferred CV pages"
              className="bg-transparent outline-none"
              value={doc.paper.pageTarget ?? (doc.paper.onePageFit ? 1 : 2)}
              onChange={(e) => {
                const pages = Number(e.target.value) as 1 | 2;
                emit({ ...doc, paper: { ...doc.paper, pageTarget: pages, onePageFit: pages === 1 } });
              }}
            >
              <option value={1}>1 page</option>
              <option value={2}>2 pages</option>
            </select>
          </label>
        ) : (
          <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={Boolean(doc.paper.onePageFit)}
              onChange={(e) => emit({ ...doc, paper: { ...doc.paper, onePageFit: e.target.checked } })}
            />
            One-page fit
          </label>
        )}
      </div>

      {doc.templateKind === "cv" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 px-3 py-2 text-xs">
          {doc.profilePhotoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local, user-provided data URL
            <img src={doc.profilePhotoDataUrl} alt="CV portrait preview" width={48} height={60} className="rounded border object-cover" />
          ) : null}
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-border px-3 font-medium">
            {photoBusy ? "Preparing photo…" : doc.profilePhotoDataUrl ? "Change passport photo" : "Add passport photo (optional)"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={photoBusy || busy !== null}
              className="sr-only"
              aria-label="Upload optional passport-style CV photo"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void handlePhotoSelected(file);
              }}
            />
          </label>
          {doc.profilePhotoDataUrl ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => emit({ ...doc, profilePhotoDataUrl: undefined, updatedAt: Date.now() })}
            >
              Remove photo
            </Button>
          ) : null}
          <span className="text-muted">Added only when you choose a photo. A photograph is not required for every country or employer.</span>
        </div>
      ) : null}

      {doc.fitWarning ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
          {doc.fitWarning}
        </p>
      ) : null}

      {pdfUnicode.hasUnsupported ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          role="status"
          data-testid="pdf-unicode-warning"
        >
          {pdfUnicode.warning}
        </p>
      ) : null}

      {pdfUnicodeConfirm ? (
        <div
          className="space-y-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-xs text-foreground"
          role="alertdialog"
          aria-labelledby="pdf-unicode-confirm-title"
          data-testid="pdf-unicode-confirm"
        >
          <p id="pdf-unicode-confirm-title" className="font-semibold">
            PDF cannot keep every character
          </p>
          <p className="text-muted">{PDF_UNICODE_LIMITATION}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={busy !== null}
              onClick={() => void runExport("pdf", { acknowledgePdfUnicode: true })}
            >
              Export PDF with “?”
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11"
              disabled={busy !== null}
              onClick={() => void runExport("docx")}
            >
              Export Word instead
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="min-h-11"
              onClick={() => setPdfUnicodeConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <DocumentToolbar editor={editor} />

      <div className="overflow-x-auto pb-1">
        <div
          className="mx-auto rounded-sm border border-[#d4d4d8] bg-white shadow-md"
          style={{
            width: "100%",
            maxWidth: preview.widthPx,
            aspectRatio: preview.aspectRatio,
            padding: "12px 14px",
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <div
        className={cn(
          "document-studio-actions flex flex-wrap gap-2 border-t border-border/60 bg-white pt-2",
          // Sticky only in true fullscreen — in chat, sticky bottom sticks to the
          // message-list viewport and overlays the document/reply text.
          fullscreen
            ? "sticky bottom-0 z-10 bg-white/95 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
            : "relative z-0 pb-2"
        )}
        data-testid="document-studio-actions"
      >
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          disabled={busy !== null}
          onClick={() => void runExport("pdf")}
        >
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export PDF
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={busy !== null}
          onClick={() => void runExport("docx")}
        >
          {busy === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export Word
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={busy !== null}
          onClick={() => void runExport("pptx")}
        >
          {busy === "pptx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Export Slides
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={busy !== null}
          onClick={() => void handleSave()}
        >
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save draft
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11"
          disabled={busy !== null}
          onClick={() => void handleShare()}
        >
          {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
          Share
        </Button>
        {onRegenerate ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-11"
            disabled={busy !== null}
            onClick={onRegenerate}
          >
            Regenerate
          </Button>
        ) : null}
      </div>

      {status ? (
        <p className="text-xs font-medium text-emerald-800" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
          role="alert"
        >
          <span>{error}</span>
          <Button type="button" size="sm" variant="secondary" className="min-h-10" onClick={() => void runExport("pdf")}>
            Retry PDF
          </Button>
        </div>
      ) : null}
    </div>
  );

  return shell;
}
