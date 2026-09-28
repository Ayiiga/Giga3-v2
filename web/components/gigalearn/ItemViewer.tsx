"use client";

import type { LearnItem } from "../../../convex/learnContent";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
  type TouchList as ReactTouchList,
} from "react";
import { createPortal } from "react-dom";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const SWIPE_THRESHOLD = 48;
const DOUBLE_TAP_MS = 280;
const TAP_MOVE_PX = 14;

const WHEEL_ZOOM_STEP = 0.0025;
const KEY_ZOOM_STEP = 0.5;

type ItemViewerProps = {
  open: boolean;
  items: LearnItem[];
  initialIndex: number;
  categoryTitle: string;
  /** Classification label shown on grid cards, e.g. "Concrete". */
  categoryBadge?: string;
  hearingId: string | null;
  triggerElement: HTMLElement | null;
  onClose: () => void;
  onHear: (item: LearnItem) => void;
};

type TouchMode = "idle" | "swipe" | "pan" | "pinch";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches: ReactTouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function touchCenter(touches: ReactTouchList) {
  if (touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

export function ItemViewer({
  open,
  items,
  initialIndex,
  categoryTitle,
  categoryBadge,
  hearingId,
  triggerElement,
  onClose,
  onHear,
}: ItemViewerProps) {
  // Parents pass inline callbacks; history/keyboard effects must not re-run on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(MIN_ZOOM);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const viewerTokenRef = useRef<string | null>(null);
  const historyPopIgnoreRef = useRef(false);
  const historyHandledByPopRef = useRef(false);
  const hadOpenRef = useRef(false);
  const wasOpenRef = useRef(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const touchModeRef = useRef<TouchMode>("idle");
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(MIN_ZOOM);
  const pinchStartCenterRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const lastTouchAtRef = useRef(0);

  const pointerIdRef = useRef<number | null>(null);
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const activeItem = items[index] ?? null;
  const canGoPrev = index > 0;
  const canGoNext = index < items.length - 1;

  const clampTranslation = useCallback((x: number, y: number, zoom: number) => {
    const viewport = viewportRef.current;
    if (!viewport || zoom <= MIN_ZOOM) return { x: 0, y: 0 };

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const maxX = ((width * zoom) - width) / 2;
    const maxY = ((height * zoom) - height) / 2;

    return {
      x: clamp(x, -maxX, maxX),
      y: clamp(y, -maxY, maxY),
    };
  }, []);

  const resetTransform = useCallback(() => {
    setScale(MIN_ZOOM);
    setTranslateX(0);
    setTranslateY(0);
    touchModeRef.current = "idle";
  }, []);

  const goPrev = useCallback(() => {
    setIndex((current) => {
      if (current <= 0) return 0;
      return current - 1;
    });
    resetTransform();
  }, [resetTransform]);

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current >= items.length - 1) return Math.max(items.length - 1, 0);
      return current + 1;
    });
    resetTransform();
  }, [items.length, resetTransform]);

  const closeFromViewer = useCallback(() => {
    onCloseRef.current();
  }, []);

  const zoomTo = useCallback(
    (nextScaleRaw: number) => {
      const nextScale = clamp(nextScaleRaw, MIN_ZOOM, MAX_ZOOM);
      if (nextScale <= MIN_ZOOM) {
        resetTransform();
        return;
      }
      setScale(nextScale);
      setTranslateX((x) => clampTranslation(x, 0, nextScale).x);
      setTranslateY((y) => clampTranslation(0, y, nextScale).y);
    },
    [clampTranslation, resetTransform]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || items.length === 0) return;
    const boundedIndex = clamp(initialIndex, 0, items.length - 1);
    setIndex(boundedIndex);
    resetTransform();
  }, [initialIndex, items.length, open, resetTransform]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const token = `gigalearn-item-viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    viewerTokenRef.current = token;
    historyHandledByPopRef.current = false;
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        __gigaLearnItemViewerToken: token,
      },
      ""
    );

    const onPopState = () => {
      if (historyPopIgnoreRef.current) return;
      const stateToken = window.history.state?.__gigaLearnItemViewerToken;
      if (stateToken !== viewerTokenRef.current) {
        historyHandledByPopRef.current = true;
        onCloseRef.current();
      }
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (
      wasOpenRef.current &&
      !open &&
      viewerTokenRef.current &&
      !historyHandledByPopRef.current &&
      window.history.state?.__gigaLearnItemViewerToken === viewerTokenRef.current
    ) {
      historyPopIgnoreRef.current = true;
      window.history.back();
      window.setTimeout(() => {
        historyPopIgnoreRef.current = false;
      }, 0);
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFromViewer();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, [contenteditable='true']")) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomTo(scale + KEY_ZOOM_STEP);
        return;
      }
      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        zoomTo(scale - KEY_ZOOM_STEP);
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        resetTransform();
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
        return;
      }
      if (event.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const selectors =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])';
        const focusable = Array.from(root.querySelectorAll<HTMLElement>(selectors)).filter(
          (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement as HTMLElement | null;

        if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeFromViewer, goNext, goPrev, open, resetTransform, scale, zoomTo]);

  useEffect(() => {
    if (hadOpenRef.current && !open && triggerElement) {
      window.setTimeout(() => {
        triggerElement.focus();
      }, 0);
    }
    hadOpenRef.current = open;
  }, [open, triggerElement]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
  }, [open]);

  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  useEffect(() => {
    if (!open || !mounted) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomTo(scaleRef.current * (1 - event.deltaY * WHEEL_ZOOM_STEP));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [mounted, open, zoomTo]);

  const contentTransform = useMemo(
    () => `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`,
    [scale, translateX, translateY]
  );

  const handleDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      if (scale > MIN_ZOOM) {
        resetTransform();
        return;
      }

      const viewport = viewportRef.current;
      if (!viewport) {
        setScale(DOUBLE_TAP_ZOOM);
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const offsetX = (centerX - clientX) * 0.6;
      const offsetY = (centerY - clientY) * 0.6;
      const next = clampTranslation(offsetX, offsetY, DOUBLE_TAP_ZOOM);

      setScale(DOUBLE_TAP_ZOOM);
      setTranslateX(next.x);
      setTranslateY(next.y);
    },
    [clampTranslation, resetTransform, scale]
  );

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      lastTouchAtRef.current = Date.now();
      const target = event.target as HTMLElement;
      if (target.closest("button")) return;

      if (event.touches.length === 2) {
        touchModeRef.current = "pinch";
        pinchStartDistanceRef.current = touchDistance(event.touches);
        pinchStartScaleRef.current = scale;
        pinchStartCenterRef.current = touchCenter(event.touches);
        panStartRef.current = { x: translateX, y: translateY };
        return;
      }

      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      panStartRef.current = { x: translateX, y: translateY };
      touchModeRef.current = scale > MIN_ZOOM ? "pan" : "swipe";
    },
    [scale, translateX, translateY]
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (touchModeRef.current === "pinch" && event.touches.length === 2) {
        event.preventDefault();
        const currentDistance = touchDistance(event.touches);
        const nextScaleRaw =
          (currentDistance / Math.max(1, pinchStartDistanceRef.current)) * pinchStartScaleRef.current;
        const nextScale = clamp(nextScaleRaw, MIN_ZOOM, MAX_ZOOM);

        const currentCenter = touchCenter(event.touches);
        const deltaX = currentCenter.x - pinchStartCenterRef.current.x;
        const deltaY = currentCenter.y - pinchStartCenterRef.current.y;
        const nextTranslate = clampTranslation(
          panStartRef.current.x + deltaX,
          panStartRef.current.y + deltaY,
          nextScale
        );

        setScale(nextScale);
        setTranslateX(nextTranslate.x);
        setTranslateY(nextTranslate.y);
        return;
      }

      if (event.touches.length !== 1) return;
      const touch = event.touches[0];

      if (touchModeRef.current === "pan") {
        event.preventDefault();
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const next = clampTranslation(
          panStartRef.current.x + deltaX,
          panStartRef.current.y + deltaY,
          scale
        );
        setTranslateX(next.x);
        setTranslateY(next.y);
      }
    },
    [clampTranslation, scale]
  );

  const handleTouchEnd = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      if (touchModeRef.current === "pinch") {
        if (scale <= MIN_ZOOM + 0.001) resetTransform();
        touchModeRef.current = "idle";
        return;
      }
      // The finger left behind after a pinch has no fresh start point; it must not swipe or tap.
      if (touchModeRef.current === "idle") return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      if (touchModeRef.current === "pan") {
        touchModeRef.current = "idle";
        return;
      }

      if (scale === MIN_ZOOM && elapsed < 550 && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext();
        if (dx > 0) goPrev();
        touchModeRef.current = "idle";
        return;
      }

      const moved = Math.hypot(dx, dy);
      if (elapsed < 280 && moved < TAP_MOVE_PX) {
        const now = Date.now();
        const sinceLastTap = now - lastTapRef.current.time;
        const fromLastTap = Math.hypot(
          touch.clientX - lastTapRef.current.x,
          touch.clientY - lastTapRef.current.y
        );

        if (sinceLastTap <= DOUBLE_TAP_MS && fromLastTap <= 32) {
          handleDoubleTap(touch.clientX, touch.clientY);
          lastTapRef.current = { time: 0, x: 0, y: 0 };
        } else {
          lastTapRef.current = {
            time: now,
            x: touch.clientX,
            y: touch.clientY,
          };
        }
      }

      touchModeRef.current = "idle";
    },
    [goNext, goPrev, handleDoubleTap, resetTransform, scale]
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      if (scale <= MIN_ZOOM) return;
      const target = event.target as HTMLElement;
      if (target.closest("button")) return;
      pointerIdRef.current = event.pointerId;
      pointerStartRef.current = { x: event.clientX - translateX, y: event.clientY - translateY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [scale, translateX, translateY]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "touch") return;
      if (pointerIdRef.current !== event.pointerId) return;
      const next = clampTranslation(
        event.clientX - pointerStartRef.current.x,
        event.clientY - pointerStartRef.current.y,
        scale
      );
      setTranslateX(next.x);
      setTranslateY(next.y);
    },
    [clampTranslation, scale]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    pointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  if (!mounted || !open || !activeItem) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[90] bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${categoryTitle} viewer`}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-4">
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`${activeItem.title}, ${index + 1} of ${items.length}${scale > MIN_ZOOM ? ", zoomed in" : ""}`}
        </p>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-100" aria-hidden>
            {categoryTitle} · <span data-testid="item-viewer-position">{index + 1} / {items.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetTransform}
              aria-label="Reset zoom"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeFromViewer}
              aria-label="Close item viewer"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-black"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={(event) => {
            if (Date.now() - lastTouchAtRef.current < 800) return;
            if ((event.target as HTMLElement).closest("button")) return;
            handleDoubleTap(event.clientX, event.clientY);
          }}
          data-testid="item-viewer-viewport"
          style={{ touchAction: "none" }}
        >
          <div
            className="select-none text-center will-change-transform"
            data-testid="item-viewer-content"
            style={{ transform: contentTransform, transformOrigin: "center center" }}
          >
            <div className="text-[140px] leading-none sm:text-[180px]" aria-hidden>
              {activeItem.emoji}
            </div>
            <p className="mt-4 text-2xl font-extrabold sm:text-3xl">{activeItem.title}</p>
            <p className="mt-1 text-sm text-gray-300">{activeItem.subtitle}</p>
            {categoryBadge ? (
              <span className="mt-2 inline-block rounded-full bg-[#3B82F6] px-2 py-0.5 text-[10px] font-bold text-white">
                {categoryBadge}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label={`Previous ${categoryTitle} item`}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 text-sm font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            aria-label={
              hearingId === activeItem.id
                ? `Playing ${activeItem.title}`
                : `Pronounce ${activeItem.title}. English first.`
            }
            aria-pressed={hearingId === activeItem.id}
            disabled={hearingId === activeItem.id}
            onClick={() => onHear(activeItem)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#EAB308] px-3 text-sm font-bold text-black disabled:opacity-60"
          >
            {hearingId === activeItem.id ? "…" : "🔊 Hear"}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            aria-label={`Next ${categoryTitle} item`}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 text-sm font-semibold disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
