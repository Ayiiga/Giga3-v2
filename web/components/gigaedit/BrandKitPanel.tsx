"use client";

import {
  DEFAULT_BRAND_KIT,
  loadBrandKit,
  saveBrandKit,
  type GigaEditBrandKit,
} from "@/lib/gigaedit/creatorStudio";
import { useEffect, useState } from "react";

export function BrandKitPanel() {
  const [kit, setKit] = useState<GigaEditBrandKit>(DEFAULT_BRAND_KIT);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadBrandKit().then((saved) => {
      setKit(saved);
      setLoaded(true);
    });
  }, []);

  async function persist(next: GigaEditBrandKit) {
    setKit(next);
    const saved = await saveBrandKit(next);
    setKit(saved);
    setStatus("Brand kit saved locally.");
    window.setTimeout(() => setStatus(null), 2500);
  }

  function updateField<K extends keyof GigaEditBrandKit>(key: K, value: GigaEditBrandKit[K]) {
    void persist({ ...kit, [key]: value });
  }

  function onLogoPick(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      void persist({ ...kit, logoDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  if (!loaded) {
    return <p className="text-sm text-[var(--ge-muted)]">Loading brand kit…</p>;
  }

  return (
    <div className="gigaedit-glass space-y-4 p-4 sm:p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-bold">🏷 Brand Kit</h2>
        <p className="text-xs text-[var(--ge-muted)]">
          Save logos, colors, fonts, and handles locally. Apply branding when exporting — your
          original media is never overwritten.
        </p>
      </header>

      {status ? (
        <p className="text-xs text-[var(--ge-gold)]" role="status">
          {status}
        </p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Brand name</span>
        <input
          type="text"
          className="gigaedit-input w-full"
          value={kit.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <ColorField label="Primary" value={kit.primaryColor} onChange={(v) => updateField("primaryColor", v)} />
        <ColorField label="Secondary" value={kit.secondaryColor} onChange={(v) => updateField("secondaryColor", v)} />
        <ColorField label="Accent" value={kit.accentColor} onChange={(v) => updateField("accentColor", v)} />
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Font family</span>
        <input
          type="text"
          className="gigaedit-input w-full"
          value={kit.fontFamily}
          onChange={(e) => updateField("fontFamily", e.target.value)}
          placeholder="system-ui, sans-serif"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Logo</span>
        <input
          type="file"
          accept="image/*"
          className="text-xs text-[var(--ge-muted)]"
          onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
        />
        {kit.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kit.logoDataUrl} alt="Brand logo" className="mt-2 h-16 w-auto rounded-lg" />
        ) : null}
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Watermark text</span>
        <input
          type="text"
          className="gigaedit-input w-full"
          value={kit.watermarkText}
          onChange={(e) => updateField("watermarkText", e.target.value)}
          placeholder="@yourhandle"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Intro</span>
        <textarea
          className="gigaedit-input w-full min-h-[3rem]"
          value={kit.introText}
          onChange={(e) => updateField("introText", e.target.value)}
          rows={2}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Outro / CTA</span>
        <textarea
          className="gigaedit-input w-full min-h-[3rem]"
          value={kit.outroText}
          onChange={(e) => updateField("outroText", e.target.value)}
          rows={2}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-[var(--ge-muted)]">Social handles</span>
        <input
          type="text"
          className="gigaedit-input w-full"
          value={kit.socialHandles}
          onChange={(e) => updateField("socialHandles", e.target.value)}
          placeholder="@giga3ai · giga3ai.com"
        />
      </label>

      <p className="text-[11px] text-[var(--ge-muted)]">
        Use <strong className="font-semibold text-[var(--ge-text)]">Apply Brand Kit</strong> in the
        video or photo editor to merge watermark and CTA text into exports. Cloud sync is not yet
        available — this kit stays on your device.
      </p>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--ge-muted)]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-lg border border-[var(--ge-border)] bg-transparent p-0.5"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="gigaedit-input min-w-0 flex-1 text-[11px]"
        />
      </div>
    </label>
  );
}
