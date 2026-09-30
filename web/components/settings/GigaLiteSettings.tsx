"use client";

import {
  GIGA_LITE_OPTIONS,
  applyGigaLiteDocumentClass,
  readGigaLiteMode,
  writeGigaLiteMode,
  type GigaLiteMode,
} from "@/lib/network/gigaLite";
import { useEffect, useState } from "react";

export function GigaLiteSettings() {
  const [mode, setMode] = useState<GigaLiteMode>("auto");

  useEffect(() => {
    setMode(readGigaLiteMode());
    applyGigaLiteDocumentClass();
  }, []);

  function select(next: GigaLiteMode) {
    setMode(next);
    writeGigaLiteMode(next);
    applyGigaLiteDocumentClass();
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Giga Lite / Data Saver</h2>
      <p className="mt-1 text-xs text-muted">
        Reduce data use on slow networks. Your choice stays on this device only.
      </p>
      <div className="mt-3 space-y-2">
        {GIGA_LITE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 has-[:checked]:border-accent/40 has-[:checked]:bg-accent/5"
          >
            <input
              type="radio"
              name="giga-lite-mode"
              className="mt-1"
              checked={mode === option.id}
              onChange={() => select(option.id)}
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              <span className="block text-xs text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
