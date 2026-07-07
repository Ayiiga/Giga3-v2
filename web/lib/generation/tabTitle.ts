let baseTitle: string | null = null;
let activeGenerationCount = 0;

function ensureBaseTitle(): string {
  if (typeof document === "undefined") return "Giga3 AI";
  if (!baseTitle) {
    baseTitle = document.title.replace(/^\(Generating…\)\s*/, "");
  }
  return baseTitle;
}

export function markGenerationTabActive(): void {
  if (typeof document === "undefined") return;
  activeGenerationCount += 1;
  if (activeGenerationCount === 1) {
    const base = ensureBaseTitle();
    document.title = `(Generating…) ${base}`;
  }
}

export function markGenerationTabIdle(): void {
  if (typeof document === "undefined") return;
  activeGenerationCount = Math.max(0, activeGenerationCount - 1);
  if (activeGenerationCount === 0) {
    document.title = ensureBaseTitle();
  }
}

export function flashGenerationTabComplete(): void {
  if (typeof document === "undefined") return;
  const base = ensureBaseTitle();
  document.title = `(Completed) ${base}`;
  window.setTimeout(() => {
    if (activeGenerationCount === 0) {
      document.title = base;
    }
  }, 2500);
}
