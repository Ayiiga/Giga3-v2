"use client";

/** Dev-only render counters (enable with ?renderProbe=1 or localStorage giga3_render_probe=1). */

declare global {
  interface Window {
    __giga3RenderCounts?: Record<string, number>;
  }
}

const counts = new Map<string, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
const lastSnapshotCounts = new Map<string, number>();

function syncToWindow(): void {
  if (typeof window === "undefined") return;
  window.__giga3RenderCounts = Object.fromEntries(counts.entries());
}

export function isRenderProbeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.location.search.includes("renderProbe=1")) return true;
    if (process.env.NODE_ENV !== "production") {
      return window.localStorage.getItem("giga3_render_probe") === "1";
    }
    return false;
  } catch {
    return false;
  }
}

function ensureSnapshotLogger(): void {
  if (snapshotTimer || typeof window === "undefined") return;
  snapshotTimer = setInterval(() => {
    if (!isRenderProbeEnabled()) return;
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (rows.length === 0) return;
    const deltas = rows.map(([name, total]) => {
      const prev = lastSnapshotCounts.get(name) ?? 0;
      lastSnapshotCounts.set(name, total);
      return [name, total - prev] as const;
    });
    console.info(
      "[giga3-render] 30s window",
      Object.fromEntries(deltas),
      "per-second:",
      Object.fromEntries(deltas.map(([name, n]) => [name, (n / 30).toFixed(4)]))
    );
  }, 30_000);
}

export function probeRender(component: string): void {
  if (!isRenderProbeEnabled()) return;
  counts.set(component, (counts.get(component) ?? 0) + 1);
  syncToWindow();
  ensureSnapshotLogger();
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    console.table(rows.map(([name, count]) => ({ component: name, renders: count })));
  }, 500);
}

export function resetRenderProbe(): void {
  counts.clear();
}
