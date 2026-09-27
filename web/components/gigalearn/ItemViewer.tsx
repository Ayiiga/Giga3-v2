"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LearnItem } from "../../../convex/learnContent";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_THRESHOLD = 48;

type ItemViewerProps = {
  open: boolean;
  categoryTitle: string;
  items: LearnItem[];
  index: number;
  hearingId: string | null;
  triggerElement?: HTMLElement | null;
  onClose: () => void;
  onHear: (item: LearnItem) => void;
  onIndexChange: (nextIndex: number) => void;
};

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ItemViewer({
  open,
  categoryTitle,
  items,
  index,
  hearingId,
  triggerElement,
  onClose,
  onHear,
  onIndexChange,
}: ItemViewerProps) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(MIN_ZOOM);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const historyEntryActiveRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(MIN_ZOOM);
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const navBlockedRef = useRef(false);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const safeIndex = clamp(index, 0, Math.max(0, items.length - 1));
  const item = items[safeIndex];
  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < items.length - 1;

  const bounds = useMemo(() => {
    const el = viewportRef.current;
    if (!el) return { maxX: 0, maxY: 0 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      maxX: Math.max(0, ((w * scale) - w) / 2),
      maxY: Math.max(0, ((h * scale) - h) / 2),
    };
  }, [scale]);

  const clampTranslate = useCallback(
    (point: Point): Point => ({
      x: clamp(point.x, -bounds.maxX, bounds.maxX),
      y: clamp(point.y, -bounds.maxY, bounds.maxY),
    }),
    [bounds.maxX, bounds.maxY]
  );

  const resetZoom = useCallback(() => {
    setScale(MIN_ZOOM);
    setTranslate({ x: 0, y: 0 });
    setIsPanning(false);
    panStartRef.current = null;
    pinchStartDistanceRef.current = null;
    navBlockedRef.current = false;
  }, []);

  const goPrev = useCallback(() => {
    if (!canGoPrev) return;
    onIndexChange(safeIndex - 1);
    resetZoom();
  }, [canGoPrev, onIndexChange, resetZoom, safeIndex]);

  const goNext = useCallback(() => {
    if (!canGoNext) return;
    onIndexChange(safeIndex + 1);
    resetZoom();
  }, [canGoNext, onIndexChange, resetZoom, safeIndex]);

  const closeWithHistorySync = useCallback(() => {
    if (!open) return;
    if (historyEntryActiveRef.current) {
      ignoreNextPopRef.current = true;
      historyEntryActiveRef.current = false;
      window.history.back();
    }
    onClose();
  }, [onClose, open]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      (triggerElement && triggerElement.isConnected ? triggerElement : null) ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      const focusTarget =
        (triggerElement && triggerElement.isConnected ? triggerElement : null) ?? restoreFocusRef.current;
      if (focusTarget && focusTarget.isConnected) {
        window.setTimeout(() => focusTarget.focus(), 0);
      }
    };
  }, [open, triggerElement]);

  useEffect(() => {
    if (!open) return;
    const state = {
      ...(window.history.state ?? {}),
      __gigalearnItemViewer: true,
    };
    window.history.pushState(state, "");
    historyEntryActiveRef.current = true;

    function onPopState() {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      historyEntryActiveRef.current = false;
      onClose();
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (historyEntryActiveRef.current) {
        ignoreNextPopRef.current = true;
        historyEntryActiveRef.current = false;
        window.history.back();
      }
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWithHistorySync();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeWithHistorySync, goNext, goPrev, open]);

  useEffect(() => {
    if (scale <= MIN_ZOOM) {
      setTranslate({ x: 0, y: 0 });
      return;
    }
    setTranslate((prev) => clampTranslate(prev));
  }, [clampTranslate, scale]);

  if (!mounted || !open || !item) return null;

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      const first = event.touches[0];
      const second = event.touches[1];
      if (!first || !second) return;
      pinchStartDistanceRef.current = Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY
      );
      pinchStartScaleRef.current = scale;
      navBlockedRef.current = true;
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    navBlockedRef.current = scale > MIN_ZOOM;
    if (scale > MIN_ZOOM) {
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tx: translate.x,
        ty: translate.y,
      };
      setIsPanning(true);
    } else {
      panStartRef.current = null;
      setIsPanning(false);
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchStartDistanceRef.current) {
      const first = event.touches[0];
      const second = event.touches[1];
      if (!first || !second) return;
      event.preventDefault();
      const distance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
      const nextScale = clamp(
        pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current),
        MIN_ZOOM,
        MAX_ZOOM
      );
      setScale(nextScale);
      navBlockedRef.current = true;
      return;
    }

    if (event.touches.length !== 1 || scale <= MIN_ZOOM || !panStartRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    const dx = touch.clientX - panStartRef.current.x;
    const dy = touch.clientY - panStartRef.current.y;
    setTranslate(
      clampTranslate({
        x: panStartRef.current.tx + dx,
        y: panStartRef.current.ty + dy,
      })
    );
    navBlockedRef.current = true;
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) {
      pinchStartDistanceRef.current = null;
    }
    if (event.touches.length > 0) return;

    setIsPanning(false);
    panStartRef.current = null;

    const changedTouch = event.changedTouches[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!changedTouch || !start) {
      navBlockedRef.current = false;
      return;
    }

    const deltaX = changedTouch.clientX - start.x;
    const deltaY = changedTouch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const duration = Date.now() - start.time;

    if (scale > MIN_ZOOM || navBlockedRef.current) {
      navBlockedRef.current = false;
      if (absX <= 14 && absY <= 14 && duration <= 260) {
        const now = Date.now();
        const lastTap = lastTapRef.current;
        if (
          lastTap &&
          now - lastTap.time < 300 &&
          Math.abs(lastTap.x - changedTouch.clientX) < 24 &&
          Math.abs(lastTap.y - changedTouch.clientY) < 24
        ) {
          resetZoom();
          lastTapRef.current = null;
          return;
        }
        lastTapRef.current = { x: changedTouch.clientX, y: changedTouch.clientY, time: now };
      }
      return;
    }

    if (absX <= 14 && absY <= 14 && duration <= 260) {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (
        lastTap &&
        now - lastTap.time < 300 &&
        Math.abs(lastTap.x - changedTouch.clientX) < 24 &&
        Math.abs(lastTap.y - changedTouch.clientY) < 24
      ) {
        setScale((current) => (current > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM));
        setTranslate({ x: 0, y: 0 });
        lastTapRef.current = null;
        return;
      }
      lastTapRef.current = { x: changedTouch.clientX, y: changedTouch.clientY, time: now };
      return;
    }

    if (absX >= SWIPE_THRESHOLD && absX > absY) {
      if (deltaX < 0) goNext();
      else goPrev();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[90] overflow-hidden bg-[#050914] text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gigalearn-item-viewer-title"
      aria-describedby="gigalearn-item-viewer-subtitle"
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden"
        style={{
          paddingTop: "max(12px, env(safe-area-inset-top))",
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          paddingLeft: "max(12px, env(safe-area-inset-left))",
          paddingRight: "max(12px, env(safe-area-inset-right))",
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-gray-300">
            {safeIndex + 1} / {items.length}
          </p>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={closeWithHistorySync}
            className="min-h-11 rounded-full border border-[#2A3441] bg-[#111A2D] px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={`Close ${categoryTitle} viewer`}
          >
            Close
          </button>
        </div>

        <div
          ref={viewportRef}
          className={cn(
            "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[#2A3441] bg-[#111A2D]",
            isPanning ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ touchAction: "none" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={() => {
            setScale((current) => (current > MIN_ZOOM ? MIN_ZOOM : DOUBLE_TAP_ZOOM));
            setTranslate({ x: 0, y: 0 });
          }}
        >
          <div
            className="select-none leading-none"
            style={{
              transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
              transition: isPanning ? "none" : "transform 120ms ease-out",
              transformOrigin: "center center",
            }}
            aria-hidden
          >
            <span className="block text-[min(56vw,220px)]">{item.emoji}</span>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <h2 id="gigalearn-item-viewer-title" className="text-xl font-bold">
            {item.title}
          </h2>
          <p id="gigalearn-item-viewer-subtitle" className="text-sm text-gray-300">
            {item.subtitle}
          </p>
          <p className="text-xs text-gray-400">Pinch to zoom · Double tap to toggle zoom · Swipe to browse</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => onHear(item)}
            disabled={hearingId === item.id}
            aria-pressed={hearingId === item.id}
            aria-label={hearingId === item.id ? `Playing ${item.title}` : `Pronounce ${item.title}`}
            className="min-h-11 rounded-full bg-[#EAB308] px-3 text-sm font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            {hearingId === item.id ? "…" : "🔊 Hear"}
          </button>
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={`Previous ${categoryTitle} item`}
            className="min-h-11 rounded-full border border-[#2A3441] bg-[#111A2D] px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={`Next ${categoryTitle} item`}
            className="min-h-11 rounded-full bg-[#3B82F6] px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
          >
            Next
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={scale <= MIN_ZOOM}
            aria-label="Reset zoom"
            className="min-h-11 rounded-full border border-[#2A3441] bg-[#111A2D] px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
          >
            Reset zoom
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
