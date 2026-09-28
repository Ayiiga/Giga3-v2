"use client";

import {
  MEDIA_STUDIO_TOOLS,
  STUDIO_TOOL_RUNTIME_HELP,
} from "@/lib/media/studioTools";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo, useState } from "react";

/** Other-tools grid with ON DEVICE / AI STUDIO badges and tap tooltips. */
export const MediaToolsGrid = memo(function MediaToolsGrid() {
  const [openTip, setOpenTip] = useState<string | null>(null);

  return (
    <section aria-label="More studio tools">
      <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">More tools</h2>
      <div className="grid grid-cols-2 gap-3 rounded-[20px] bg-[#1A233A] p-4">
        {MEDIA_STUDIO_TOOLS.map((tool) => {
          const onDevice = tool.runtime === "ON DEVICE";
          return (
            <div key={tool.id} className="min-w-0">
              <Link
                href={tool.href}
                onClick={() => setOpenTip((t) => (t === tool.id ? null : tool.id))}
                title={`${tool.title} — ${STUDIO_TOOL_RUNTIME_HELP[tool.runtime]}${tool.creditHint ? ` · ${tool.creditHint}` : ""}`}
                aria-label={`${tool.title} — ${tool.runtime}. ${tool.description}`}
                className={cn(
                  "flex min-h-[5.5rem] flex-col items-start gap-1 rounded-2xl p-3 text-left",
                  onDevice
                    ? "border-2 border-[#EAB308] bg-transparent hover:bg-[#EAB308]/10"
                    : "bg-[#EAB308] hover:bg-[#d4a017]"
                )}
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tool.emoji}
                </span>
                <span
                  className={cn(
                    "block w-full text-[13px] font-bold leading-tight",
                    onDevice ? "text-white" : "text-black"
                  )}
                >
                  {tool.title}
                </span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    onDevice ? "border border-[#EAB308] text-[#EAB308]" : "bg-black text-[#EAB308]"
                  )}
                >
                  {tool.runtime}
                  {tool.creditHint ? ` · ${tool.creditHint}` : ""}
                </span>
              </Link>
              {openTip === tool.id ? (
                <p className="mt-1 rounded-lg bg-[#0F172A] px-2 py-1 text-[11px] text-gray-300" role="status">
                  {STUDIO_TOOL_RUNTIME_HELP[tool.runtime]}
                  {tool.creditHint ? ` (${tool.creditHint})` : ""}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
});
