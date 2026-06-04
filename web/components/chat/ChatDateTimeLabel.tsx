"use client";

import { formatCurrentDateTime } from "@/lib/datetime";
import { useEffect, useState } from "react";

/** Live date/time label for chat chrome — updates every minute. */
export function ChatDateTimeLabel() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      try {
        setLabel(formatCurrentDateTime());
      } catch {
        setLabel("");
      }
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <time
      dateTime={label ? new Date().toISOString() : undefined}
      className="hidden min-w-[10rem] text-sm font-medium text-muted md:inline-block"
      suppressHydrationWarning
      aria-hidden={!label}
    >
      {label ?? "\u00a0"}
    </time>
  );
}
