"use client";

import type { GigaEditSection } from "@/lib/gigaedit/types";
import { CREATOR_STUDIO_PRODUCT_NAME } from "@/lib/gigaedit/creatorStudio";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const SECTION_LABELS: Record<GigaEditSection, string> = {
  home: "Home",
  video: "Video",
  photo: "Photo",
  teleprompter: "Teleprompter",
  script: "AI Script",
  templates: "Templates",
  audio: "Audio",
  social: "Social",
  projects: "Projects",
  ai: "AI Assist",
  brand: "Brand Kit",
};

export type EditorShellProps = {
  section: GigaEditSection;
  onBackHome: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function EditorShell({ section, onBackHome, children, footer }: EditorShellProps) {
  return (
    <div className="gigaedit-shell gigaedit-stable mx-auto max-w-5xl rounded-2xl px-3 py-4 sm:px-5 sm:py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {section !== "home" ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--ge-border)] text-[var(--ge-muted)]"
              aria-label="Back to Creator Studio home"
              onClick={onBackHome}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ge-gold)]">
              {CREATOR_STUDIO_PRODUCT_NAME}
            </p>
            <p className="text-xs text-[var(--ge-muted)]">{SECTION_LABELS[section]}</p>
          </div>
        </div>
        <Link
          href="/media/"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-1.5 text-[11px] text-[var(--ge-muted)]"
        >
          AI Studio
        </Link>
      </div>

      {children}
      {footer}
    </div>
  );
}

export { SECTION_LABELS as GIGAEDIT_SECTION_LABELS };
