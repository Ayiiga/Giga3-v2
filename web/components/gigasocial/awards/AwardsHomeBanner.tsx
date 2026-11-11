"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AWARDS_BANNER_DISMISS_KEY,
  AWARDS_PATHS,
} from "@/lib/gigasocial/awards/constants";

const decemberDismissKey = `${AWARDS_BANNER_DISMISS_KEY}:december-2026`;

/**
 * Dismissible homepage / marketing banner. Does not auto-publish seasons.
 * Visible only when localStorage has not dismissed it.
 */
export function AwardsHomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(decemberDismissKey) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="border-b border-border bg-violet-50 px-4 py-3 text-sm text-violet-950">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <p>
          <span className="font-semibold">GigaSocial Awards</span> — December 2026 Creator Edition in preparation.{" "}
          <Link href={`${AWARDS_PATHS.home}#december-2026`} className="font-medium underline">
            See December preview
          </Link>
        </p>
        <button
          type="button"
          className="min-h-10 rounded-lg px-3 text-violet-900 underline"
          onClick={() => {
            try {
              localStorage.setItem(decemberDismissKey, "1");
            } catch {
              /* ignore */
            }
            setVisible(false);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
