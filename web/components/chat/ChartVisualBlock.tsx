"use client";

import { ShareActionFeedback } from "@/components/chat/ShareActionFeedback";
import { useShareAction } from "@/hooks/useShareAction";
import { shareFiles, shareText, triggerAttributedImageDownload, triggerDownload, type ShareResult } from "@/lib/share/clientShare";
import { Download, Share2 } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

type ChartDataset = {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
};

type ChartSpec = {
  title?: string;
  type?: "bar" | "line" | "pie" | "radar";
  labels?: string[];
  datasets?: ChartDataset[];
};

type ReactChartsModule = Awaited<typeof import("react-chartjs-2")>;

interface ChartVisualBlockProps {
  specJson: string;
}

type DownloadFormat = "png" | "jpg" | "svg" | "pdf";

function parseChartSpec(specJson: string): ChartSpec | null {
  try {
    const parsed = JSON.parse(specJson) as ChartSpec;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  if (!res.ok) throw new Error("Failed to convert rendered chart.");
  return await res.blob();
}

const DEFAULT_COLORS = [
  "rgba(99, 102, 241, 0.7)",
  "rgba(14, 165, 233, 0.7)",
  "rgba(236, 72, 153, 0.7)",
  "rgba(34, 197, 94, 0.7)",
  "rgba(245, 158, 11, 0.7)",
];

export const ChartVisualBlock = memo(function ChartVisualBlock({
  specJson,
}: ChartVisualBlockProps) {
  const spec = useMemo(() => parseChartSpec(specJson), [specJson]);
  const [charts, setCharts] = useState<ReactChartsModule | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { runAction, feedback, busy } = useShareAction();

  useEffect(() => {
    let cancelled = false;
    async function loadCharts() {
      await import("chart.js/auto");
      const reactCharts = await import("react-chartjs-2");
      if (!cancelled) {
        setCharts(reactCharts);
      }
    }
    void loadCharts();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!spec) {
    return (
      <pre className="chat-md-pre">
        <code>{specJson}</code>
      </pre>
    );
  }

  const title = spec.title?.trim() || "Generated chart";
  const labels = spec.labels ?? ["A", "B", "C"];
  const datasets =
    spec.datasets?.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      borderColor: dataset.borderColor ?? "rgba(79, 70, 229, 1)",
      borderWidth: 2,
      tension: 0.35,
      fill: false,
    })) ?? [
      {
        label: "Series 1",
        data: labels.map((_, index) => labels.length - index),
        backgroundColor: DEFAULT_COLORS[0],
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 2,
      },
    ];

  const chartData = { labels, datasets };
  const chartType = spec.type ?? "bar";
  const baseName = safeSlug(title || "giga3-chart") || "giga3-chart";

  const exportChart = async (format: DownloadFormat): Promise<ShareResult> => {
    const node = chartRef.current;
    if (!node) return { ok: false, reason: "Chart is not ready yet." };
    const htmlToImage = await import("html-to-image");
    const options = { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" };
    if (format === "pdf") {
      const dataUrl = await htmlToImage.toPng(node, options);
      const bytes = await fetch(dataUrl).then((res) => res.arrayBuffer());
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const png = await pdf.embedPng(bytes);
      const page = pdf.addPage([png.width, png.height]);
      page.drawImage(png, { x: 0, y: 0, width: png.width, height: png.height });
      const pdfBytes = await pdf.save();
      const safePdfBytes = new Uint8Array(pdfBytes.length);
      safePdfBytes.set(pdfBytes);
      return triggerDownload(
        new Blob([safePdfBytes], { type: "application/pdf" }),
        `${baseName}.pdf`
      );
    }
    if (format === "svg") {
      const dataUrl = await htmlToImage.toSvg(node, options);
      const blob = await dataUrlToBlob(dataUrl);
      return triggerDownload(blob, `${baseName}.svg`);
    }
    const dataUrl =
      format === "jpg"
        ? await htmlToImage.toJpeg(node, { ...options, quality: 0.95 })
        : await htmlToImage.toPng(node, options);
    const blob = await dataUrlToBlob(dataUrl);
    return triggerAttributedImageDownload(blob, `${baseName}.${format}`);
  };

  const shareChart = async (): Promise<ShareResult> => {
    const node = chartRef.current;
    if (!node) return { ok: false, reason: "Chart is not ready yet." };
    const htmlToImage = await import("html-to-image");
    const dataUrl = await htmlToImage.toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const blob = await dataUrlToBlob(dataUrl);
    const file = new File([blob], `${baseName}.png`, { type: "image/png" });
    const shared = await shareFiles([file], { title, text: title });
    if (shared.ok) return shared;
    return shareText({ title, text: title });
  };

  const chartProps = {
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: "bottom" as const },
      },
      scales:
        chartType === "pie"
          ? undefined
          : {
              y: { beginAtZero: true },
            },
    },
  };

  return (
    <div className="chat-md-diagram rounded-2xl border border-accent/20 bg-white p-3 shadow-sm dark:bg-zinc-900">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
        Data visualization
      </p>
      <div
        ref={chartRef}
        className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900"
      >
        <h4 className="text-base font-bold">{title}</h4>
        <div className="mt-3 h-64 w-full">
          {charts ? (
            chartType === "line" ? (
              <charts.Line data={chartData as never} options={chartProps.options as never} />
            ) : chartType === "pie" ? (
              <charts.Pie data={chartData as never} options={chartProps.options as never} />
            ) : chartType === "radar" ? (
              <charts.Radar data={chartData as never} options={chartProps.options as never} />
            ) : (
              <charts.Bar data={chartData as never} options={chartProps.options as never} />
            )
          ) : (
            <p className="text-sm text-zinc-500">Loading chart renderer…</p>
          )}
        </div>
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
                  () => exportChart(format),
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
            onClick={() => void runAction(shareChart, "Chart shared")}
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
