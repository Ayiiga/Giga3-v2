"use client";

import { formatCurrentDateTime } from "@/lib/datetime";
import { useEffect, useState } from "react";

/** Live date/time label for chat chrome — reserves width to avoid header shift. */
export function ChatDateTimeLabel() {
  const [label, setLabel] = useState("");

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
      dateTime={label || undefined}
      className="hidden min-w-[9.5rem] text-right text-sm text-muted md:block"
      suppressHydrationWarning
      aria-hidden={!label}
    >
      {label || "\u00a0"}
    </time>
  );
}
