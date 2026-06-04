"use client";

import { copyTextToClipboard, saveToGallery, shareRemoteMedia } from "@/lib/download";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

interface MediaContextMenuProps {
  url: string;
  mediaType: "image" | "video";
  children: React.ReactNode;
  className?: string;
}

export function MediaContextMenu({
  url,
  mediaType,
  children,
  className,
}: MediaContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const ext = mediaType === "video" ? "mp4" : "png";
  const filename = `giga3-${mediaType}-${Date.now()}.${ext}`;
  const mimeType = mediaType === "video" ? "video/mp4" : "image/png";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  function showMenu(clientX: number, clientY: number) {
    const pad = 8;
    const x = Math.min(clientX, window.innerWidth - 200 - pad);
    const y = Math.min(clientY, window.innerHeight - 180 - pad);
    setPos({ x: Math.max(pad, x), y: Math.max(pad, y) });
    setOpen(true);
    setStatus(null);
    setProgress(null);
  }

  async function runAction(
    label: string,
    fn: () => Promise<void>
  ) {
    setStatus(label);
    try {
      await fn();
      setStatus(`${label} — done`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setProgress(null);
      window.setTimeout(close, 600);
    }
  }

  const itemClass =
    "block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-zinc-100";

  return (
    <div
      className={cn("relative", className)}
      onContextMenu={(e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        longPressRef.current = window.setTimeout(() => {
          showMenu(touch.clientX, touch.clientY);
        }, 500);
      }}
      onTouchEnd={() => {
        if (longPressRef.current) {
          window.clearTimeout(longPressRef.current);
          longPressRef.current = null;
        }
      }}
      onTouchMove={() => {
        if (longPressRef.current) {
          window.clearTimeout(longPressRef.current);
          longPressRef.current = null;
        }
      }}
    >
      {children}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] min-w-[11rem] rounded-xl border border-border bg-white p-1.5 shadow-xl"
          style={{ left: pos.x, top: pos.y }}
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() =>
              void runAction("Copy link", () => copyTextToClipboard(url))
            }
          >
            Copy
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() =>
              void runAction("Share", async () => {
                await shareRemoteMedia({
                  title: `Giga3 ${mediaType}`,
                  url,
                  filename,
                  mimeType,
                  onProgress: setProgress,
                });
              })
            }
          >
            Share
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() =>
              void runAction("Download", async () => {
                const r = await saveToGallery({
                  url,
                  filename,
                  mimeType,
                  onProgress: setProgress,
                });
                setStatus(r.message);
              })
            }
          >
            Download
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() =>
              void runAction("Save to Gallery", async () => {
                const r = await saveToGallery({
                  url,
                  filename,
                  mimeType,
                  onProgress: setProgress,
                });
                setStatus(r.message);
              })
            }
          >
            Save to Gallery
          </button>
        </div>
      )}
      {(status || progress !== null) && (
        <p className="mt-1 text-xs font-medium text-muted" role="status">
          {progress !== null && progress < 100 ? `Downloading… ${progress}%` : status}
        </p>
      )}
    </div>
  );
}
