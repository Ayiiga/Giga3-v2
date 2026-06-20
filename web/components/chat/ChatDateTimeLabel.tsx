"use client";

import { formatCurrentDateTime, toIsoDateTime } from "@/lib/datetime";
import { useEffect, useState } from "react";

/** Live date/time label for chat chrome — updates every minute. */
export function ChatDateTimeLabel() {
  const [label, setLabel] = useState("");
  const [isoDateTime, setIsoDateTime] = useState("");

  useEffect(() => {
    function tick() {
      try {
        const now = new Date();
        setLabel(formatCurrentDateTime(now));
        setIsoDateTime(toIsoDateTime(now));
      } catch {
        setLabel("");
        setIsoDateTime("");
      }
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!label) return null;

  return (
    <time
      dateTime={isoDateTime}
      className="hidden text-sm font-medium text-muted md:block"
      suppressHydrationWarning
    >
      {label}
    </time>
  );
}
