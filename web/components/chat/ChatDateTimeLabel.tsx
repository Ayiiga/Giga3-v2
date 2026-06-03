"use client";

import { formatCurrentDateTime } from "@/lib/datetime";
import { useEffect, useState } from "react";

/** Live date/time label for chat chrome — updates every minute. */
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

  if (!label) return null;

  return (
    <time
      dateTime={new Date().toISOString()}
      className="hidden text-sm font-medium text-muted md:block"
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}
