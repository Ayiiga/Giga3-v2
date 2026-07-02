"use client";

import { sanitizeMermaidSvg } from "@/lib/security/sanitizeMermaidSvg";
import { useEffect, useId, useRef, useState } from "react";

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function renderDiagram() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          // Render labels as native SVG <text> (not HTML <foreignObject>) so
          // they survive SVG sanitization and display correctly.
          htmlLabels: false,
          flowchart: { htmlLabels: false, useMaxWidth: true },
          themeVariables: {
            primaryColor: "#ede9fe",
            primaryTextColor: "#171717",
            primaryBorderColor: "#8b5cf6",
            lineColor: "#6d28d9",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        });
        const { svg } = await mermaid.render(`giga3-diagram-${id}`, code);
        const safeSvg = sanitizeMermaidSvg(svg);
        if (!safeSvg) {
          throw new Error("Could not render diagram safely.");
        }
        if (!cancelled && ref.current) {
          ref.current.replaceChildren();
          const template = document.createElement("template");
          template.innerHTML = safeSvg;
          const svgNode = template.content.firstElementChild;
          if (!svgNode) {
            throw new Error("Could not render diagram safely.");
          }
          ref.current.appendChild(svgNode);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not render diagram.");
        }
      }
    }
    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <div className="chat-md-diagram rounded-2xl border border-accent/20 bg-white p-3 shadow-sm dark:bg-zinc-900">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
        Visual diagram
      </p>
      {error ? (
        <pre className="chat-md-pre">
          <code>{code}</code>
        </pre>
      ) : (
        <div
          ref={ref}
          className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          aria-label="Generated diagram"
        />
      )}
    </div>
  );
}
