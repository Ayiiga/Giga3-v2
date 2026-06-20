"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { useShareAction } from "@/hooks/useShareAction";
import { shareFiles, shareText, triggerDownload, type ShareResult } from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import { Download, Share2 } from "lucide-react";
import { memo, useMemo, useRef } from "react";

type VisualSection = {
  heading: string;
  items: string[];
};

type VisualComparison = {
  headers: [string, string];
  rows: Array<[string, string]>;
};

type VisualSpec = {
  version?: string;
  kind?: string;
  title?: string;
  summary?: string;
  size?: string;
  exportFormats?: string[];
  sections?: VisualSection[];
  comparison?: VisualComparison;
};

interface VisualContentBlockProps {
  specJson: string;
}

type DownloadFormat = "png" | "jpg" | "svg" | "pdf";

function safeParseVisualSpec(specJson: string): VisualSpec | null {
  try {
    const parsed = JSON.parse(specJson) as VisualSpec;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Could not convert image output.");
  return await res.blob();
}

function visualSizeClass(size: string | undefined): string {
  const normalized = (size ?? "").toLowerCase();
  if (normalized.includes("a3")) return "max-w-[860px]";
  if (normalized.includes("youtube")) return "max-w-[760px]";
  if (normalized.includes("facebook") || normalized.includes("linkedin"))
    return "max-w-[760px]";
  if (normalized.includes("instagram") || normalized.includes("tiktok"))
    return "max-w-[420px]";
  return "max-w-[720px]";
}

export const VisualContentBlock = memo(function VisualContentBlock({
  specJson,
}: VisualContentBlockProps) {
  const spec = useMemo(() => safeParseVisualSpec(specJson), [specJson]);
  const cardRef = useRef<HTMLDivElement>(null);
  const { runAction, feedback, busy } = useShareAction();

  if (!spec) {
    return (
      <pre className="chat-md-pre">
        <code>{specJson}</code>
      </pre>
    );
  }

  const title = spec.title?.trim() || "Generated visual";
  const summary = spec.summary?.trim();
  const kind = spec.kind?.replace(/_/g, " ");
  const size = spec.size ?? "A4";
  const baseName = toSlug(title || "giga3-visual") || "giga3-visual";
  const sections = spec.sections ?? [];

  const exportVisual = async (format: DownloadFormat): Promise<ShareResult> => {
    const node = cardRef.current;
    if (!node) return { ok: false, reason: "Visual is not ready yet." };

    const htmlToImage = await import("html-to-image");
    const options = {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    };

    if (format === "svg") {
      const dataUrl = await htmlToImage.toSvg(node, options);
      const blob = await dataUrlToBlob(dataUrl);
      return triggerDownload(blob, `${baseName}.svg`);
    }

    if (format === "pdf") {
      const dataUrl = await htmlToImage.toPng(node, options);
      const pngBytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const png = await pdf.embedPng(pngBytes);
      const page = pdf.addPage([png.width, png.height]);
      page.drawImage(png, {
        x: 0,
        y: 0,
        width: png.width,
        height: png.height,
      });
      const pdfBytes = await pdf.save();
      const safePdfBytes = new Uint8Array(pdfBytes.length);
      safePdfBytes.set(pdfBytes);
      return triggerDownload(
        new Blob([safePdfBytes], { type: "application/pdf" }),
        `${baseName}.pdf`
      );
    }

    if (format === "jpg") {
      const dataUrl = await htmlToImage.toJpeg(node, { ...options, quality: 0.95 });
      const blob = await dataUrlToBlob(dataUrl);
      return triggerDownload(blob, `${baseName}.jpg`);
    }

    const dataUrl = await htmlToImage.toPng(node, options);
    const blob = await dataUrlToBlob(dataUrl);
    return triggerDownload(blob, `${baseName}.png`);
  };

  const shareVisual = async (): Promise<ShareResult> => {
    const node = cardRef.current;
    if (!node) return { ok: false, reason: "Visual is not ready yet." };
    const htmlToImage = await import("html-to-image");
    const dataUrl = await htmlToImage.toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], `${baseName}.png`, { type: "image/png" });
    const shared = await shareFiles([file], {
      title,
      text: summary ?? title,
    });
    if (shared.ok) return shared;
    return shareText({ title, text: summary ?? title });
  };

  return (
    <div className="chat-md-diagram rounded-2xl border border-accent/20 bg-white p-3 shadow-sm dark:bg-zinc-900">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
        Visual content
      </p>

      <div
        ref={cardRef}
        className={cn(
          "rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 text-zinc-900",
          visualSizeClass(size)
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {kind && (
            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">
              {kind}
            </span>
          )}
          <span className="rounded-full bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-white">
            {size}
          </span>
        </div>
        <h4 className="text-base font-bold leading-tight">{title}</h4>
        {summary && <p className="mt-1 text-sm text-zinc-700">{summary}</p>}

        <div className="mt-3 space-y-3">
          {sections.map((section, index) => (
            <section key={`${section.heading}-${index}`}>
              <h5 className="text-sm font-semibold text-zinc-900">{section.heading}</h5>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-zinc-800">
                {section.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {spec.comparison && (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-zinc-300 bg-zinc-100 px-2 py-1 text-left">
                    {spec.comparison.headers[0]}
                  </th>
                  <th className="border border-zinc-300 bg-zinc-100 px-2 py-1 text-left">
                    {spec.comparison.headers[1]}
                  </th>
                </tr>
              </thead>
              <tbody>
                {spec.comparison.rows.map((row, index) => (
                  <tr key={`${row[0]}-${index}`}>
                    <td className="border border-zinc-300 px-2 py-1">{row[0]}</td>
                    <td className="border border-zinc-300 px-2 py-1">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="relative mt-3 min-h-7">
        <ShareActionFeedback feedback={feedback} />
        <div className="flex flex-wrap gap-2">
          {(["png", "jpg", "svg", "pdf"] as DownloadFormat[]).map((format) => (
            <button
              key={format}
              type="button"
              disabled={busy}
              onClick={() =>
                void runAction(
                  () => exportVisual(format),
                  `Downloaded ${format.toUpperCase()}`
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:border-violet-400 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {format.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(shareVisual, "Visual shared")}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:border-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share
          </button>
        </div>
      </div>
    </div>
  );
});
