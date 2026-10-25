"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AWARDS_BANNER_DISMISS_KEY,
  AWARDS_PATHS,
} from "@/lib/gigasocial/awards/constants";

/**
 * Dismissible homepage / marketing banner. Does not auto-publish seasons.
 * Visible only when localStorage has not dismissed it.
 */
export function AwardsHomeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(AWARDS_BANNER_DISMISS_KEY) === "1") return;
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
          <span className="font-semibold">GigaSocial Awards</span> — free nominations and free
          voting for creators.{" "}
          <Link href={AWARDS_PATHS.home} className="font-medium underline">
            Learn more
          </Link>
        </p>
        <button
          type="button"
          className="min-h-10 rounded-lg px-3 text-violet-900 underline"
          onClick={() => {
            try {
              localStorage.setItem(AWARDS_BANNER_DISMISS_KEY, "1");
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
