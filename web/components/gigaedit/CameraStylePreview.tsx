"use client";

import {
  DEFAULT_CAMERA_LOOK,
  composeCameraLookCss,
  cameraLookTransformCss,
  describeCameraLook,
  emptyFrameAnalysis,
  type CameraLookOptions,
  type FrameAnalysis,
  type WhiteBalancePreset,
} from "@/lib/gigaedit/cameraLook";
import {
  detectDeviceTier,
  getLookAnalysisIntervalMs,
  type DeviceTier,
} from "@/lib/gigaedit/deviceCapability";
import { analyzeMediaElement, scheduleIdleWork } from "@/lib/gigaedit/mediaPipeline";
import { cn } from "@/lib/utils";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";

export type CameraStylePreviewHandle = {
  getComposedFilter: () => string;
  getLook: () => CameraLookOptions;
  getAnalysis: () => FrameAnalysis;
};

type CommonProps = {
  aspectRatioCss: string;
  className?: string;
  overlay?: ReactNode;
  baseFilterCss?: string;
  baseFilterId?: string;
  /** Appended after camera-look transform (e.g. rotate / crop). */
  extraTransform?: string;
  look?: Partial<CameraLookOptions>;
  onLookChange?: (look: CameraLookOptions) => void;
  showControls?: boolean;
  emptyLabel?: string;
};

type ImageProps = CommonProps & {
  kind: "image";
  src: string | null;
  alt?: string;
  imgRef?: Ref<HTMLImageElement>;
};

type VideoProps = CommonProps & {
  kind: "video";
  src?: string | null;
  stream?: MediaStream | null;
  videoRef?: Ref<HTMLVideoElement>;
  controls?: boolean;
  muted?: boolean;
  onLoadedMetadata?: (el: HTMLVideoElement) => void;
  onTimeUpdate?: (el: HTMLVideoElement) => void;
};

export type CameraStylePreviewProps = ImageProps | VideoProps;

function mergeLook(partial?: Partial<CameraLookOptions>): CameraLookOptions {
  return { ...DEFAULT_CAMERA_LOOK, ...partial };
}

export const CameraStylePreview = forwardRef<CameraStylePreviewHandle, CameraStylePreviewProps>(
  function CameraStylePreview(props, ref) {
    const [look, setLook] = useState<CameraLookOptions>(() => mergeLook(props.look));
    const [analysis, setAnalysis] = useState<FrameAnalysis>(emptyFrameAnalysis);
    const [tier] = useState<DeviceTier>(() => detectDeviceTier());
    const localImgRef = useRef<HTMLImageElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    const kind = props.kind;
    const mediaSrc = props.kind === "image" ? props.src : props.src ?? null;
    const mediaStream = props.kind === "video" ? props.stream ?? null : null;
    const baseFilterCss = props.baseFilterCss;
    const baseFilterId = props.baseFilterId;
    const extraTransform = props.extraTransform;
    const lookPatch = props.look;

    useEffect(() => {
      if (lookPatch) setLook(mergeLook(lookPatch));
      // Field-level deps avoid resetting local toggles on identical object identity.
      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field sync
    }, [
      lookPatch?.adaptiveBrightness,
      lookPatch?.hdr,
      lookPatch?.autoExposure,
      lookPatch?.autofocus,
      lookPatch?.whiteBalance,
      lookPatch?.stabilization,
      lookPatch?.portrait,
      lookPatch?.lowLight,
      lookPatch?.naturalColors,
    ]);

    const composedFilter = useMemo(
      () =>
        composeCameraLookCss({
          look,
          analysis,
          baseFilterCss,
          baseFilterId,
          tier,
        }),
      [look, analysis, baseFilterCss, baseFilterId, tier]
    );

    const transformCss = useMemo(() => {
      const stabilize = cameraLookTransformCss(look, tier);
      const extra = extraTransform?.trim();
      if (stabilize !== "none" && extra) return `${stabilize} ${extra}`;
      if (extra) return extra;
      return stabilize;
    }, [look, tier, extraTransform]);

    useImperativeHandle(
      ref,
      () => ({
        getComposedFilter: () => composedFilter,
        getLook: () => look,
        getAnalysis: () => analysis,
      }),
      [composedFilter, look, analysis]
    );

    useEffect(() => {
      if (kind !== "video") return;
      const el = localVideoRef.current;
      if (!el) return;
      if (mediaStream) {
        el.srcObject = mediaStream;
        void el.play().catch(() => undefined);
      } else if (!mediaSrc) {
        el.srcObject = null;
      }
    }, [kind, mediaStream, mediaSrc]);

    useEffect(() => {
      const mediaEl = kind === "image" ? localImgRef.current : localVideoRef.current;
      const hasMedia = kind === "image" ? Boolean(mediaSrc) : Boolean(mediaSrc || mediaStream);
      if (!mediaEl || !hasMedia) return;

      let cancelled = false;
      let cancelIdle: (() => void) | undefined;
      const interval = getLookAnalysisIntervalMs(tier);

      const run = () => {
        cancelIdle = scheduleIdleWork(() => {
          if (cancelled) return;
          void analyzeMediaElement(mediaEl, tier).then((next) => {
            if (!cancelled) setAnalysis(next);
          });
        }, interval);
      };

      run();
      const timer = window.setInterval(run, interval);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
        cancelIdle?.();
      };
    }, [kind, mediaSrc, mediaStream, tier]);

    function patchLook(partial: Partial<CameraLookOptions>) {
      setLook((prev) => {
        const next = { ...prev, ...partial };
        props.onLookChange?.(next);
        return next;
      });
    }

    const mediaStyle = {
      "--ge-filter": composedFilter,
      "--ge-transform": transformCss,
      filter: "var(--ge-filter)",
      transform: "var(--ge-transform)",
    } as CSSProperties;

    const showControls = props.showControls !== false;

    return (
      <div className={cn("space-y-2", props.className)}>
        <div className="gigaedit-glass p-3">
          <div
            className="gigaedit-allow-effects gigaedit-camera-preview relative mx-auto max-h-[55vh] overflow-hidden rounded-xl bg-black"
            style={{ aspectRatio: props.aspectRatioCss, width: "min(100%, 420px)" }}
          >
            {props.kind === "image" && props.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={(node) => {
                  localImgRef.current = node;
                  const outer = props.imgRef;
                  if (typeof outer === "function") outer(node);
                  else if (outer && "current" in outer) {
                    (outer as { current: HTMLImageElement | null }).current = node;
                  }
                }}
                src={props.src}
                alt={props.alt ?? "Photo being edited"}
                className="h-full w-full object-cover"
                decoding="async"
                style={mediaStyle}
              />
            ) : null}

            {props.kind === "video" && (props.src || props.stream) ? (
              <video
                ref={(node) => {
                  localVideoRef.current = node;
                  const outer = props.videoRef;
                  if (typeof outer === "function") outer(node);
                  else if (outer && "current" in outer) {
                    (outer as { current: HTMLVideoElement | null }).current = node;
                  }
                }}
                src={props.src ?? undefined}
                controls={props.controls}
                playsInline
                muted={props.muted}
                className="h-full w-full object-cover"
                style={mediaStyle}
                onLoadedMetadata={(e) => props.onLoadedMetadata?.(e.currentTarget)}
                onTimeUpdate={(e) => props.onTimeUpdate?.(e.currentTarget)}
              />
            ) : null}

            {!(props.kind === "image" ? props.src : props.src || props.stream) ? (
              <div className="flex h-full min-h-[220px] items-center justify-center p-6 text-center text-xs text-[var(--ge-muted)]">
                {props.emptyLabel ?? "Import media to open the camera-style preview."}
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
              <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ge-gold)]">
                Pro preview · {tier}
              </span>
              {look.hdr ? (
                <span className="rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  HDR
                </span>
              ) : null}
            </div>

            {props.overlay}
          </div>
        </div>

        {showControls ? (
          <div className="gigaedit-glass space-y-2 p-3">
            <p className="text-[11px] text-[var(--ge-muted)]">
              {describeCameraLook(look, analysis)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["adaptiveBrightness", "Brightness"],
                  ["hdr", "HDR"],
                  ["autoExposure", "Exposure"],
                  ["autofocus", "Focus"],
                  ["stabilization", "Stabilize"],
                  ["portrait", "Portrait"],
                  ["lowLight", "Low light"],
                  ["naturalColors", "Natural"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-medium",
                    look[key]
                      ? "border-[var(--ge-gold)]/50 bg-[var(--ge-gold)]/15 text-[var(--ge-gold)]"
                      : "border-[var(--ge-border)] text-[var(--ge-muted)]"
                  )}
                  aria-pressed={look[key]}
                  onClick={() => patchLook({ [key]: !look[key] })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="block text-[11px] text-[var(--ge-muted)]">
              White balance
              <select
                className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-2 py-1.5 text-xs"
                value={look.whiteBalance}
                onChange={(e) =>
                  patchLook({ whiteBalance: e.target.value as WhiteBalancePreset })
                }
              >
                <option value="auto">Auto</option>
                <option value="daylight">Daylight</option>
                <option value="cloudy">Cloudy</option>
                <option value="tungsten">Tungsten</option>
                <option value="fluorescent">Fluorescent</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>
    );
  }
);
