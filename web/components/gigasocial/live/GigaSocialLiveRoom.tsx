"use client";

import { PreSnapEditBar } from "@/components/gigasocial/studio/PreSnapEditBar";
import { GigaSocialTeleprompter } from "@/components/gigasocial/studio/GigaSocialTeleprompter";
import { GigaSocialReportDialog } from "@/components/gigasocial/trust/GigaSocialReportDialog";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  getCameraFilterCss,
  type CameraFilterId,
} from "@/lib/gigasocial/cameraFilters";
import type { CameraCaptureModeId } from "@/lib/gigasocial/cameraModes";
import {
  LIVE_GIFTS,
  LIVE_REACTIONS,
  getLiveActionErrorMessage,
  LIVE_SCREEN_SHARE_MOBILE_HINT,
  LIVE_VIDEO_CAPTURE_CONSTRAINTS,
  getLiveMediaErrorMessage,
  getLiveReactionCount,
  supportsLiveCameraMic,
  type LiveStreamMode,
} from "@/lib/gigasocial/liveStreaming";
import {
  requestMobileScreenShareCameraStream,
  requestMobileScreenShareFromFile,
  requestOsDisplayCaptureStream,
  supportsOsDisplayCapture,
  takeLiveScreenShareHandoff,
  type ScreenShareSource,
} from "@/lib/gigasocial/liveScreenShare";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Gift, MessageCircle, MonitorUp, Radio, Shield, Type, Users, X, Mic, MicOff, Video, VideoOff, Maximize, Minimize, SlidersHorizontal } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PendingChatMessage = {
  id: string;
  body: string;
  status: "sending" | "failed";
};

export const GigaSocialLiveRoom = memo(function GigaSocialLiveRoom({
  sessionToken,
  streamId,
  isHost,
  onClose,
}: {
  sessionToken: string;
  streamId: Id<"socialLiveStreams">;
  isHost: boolean;
  onClose: () => void;
}) {
  const data = useQuery(api.gigaSocialLive.getLiveStream, { streamId, sessionToken });
  const joinLive = useMutation(api.gigaSocialLive.joinLiveStream);
  const sendChat = useMutation(api.gigaSocialLive.sendLiveChat);
  const sendReaction = useMutation(api.gigaSocialLive.sendLiveReaction);
  const sendGift = useMutation(api.gigaSocialLive.sendLiveGift);
  const addCaption = useMutation(api.gigaSocialLive.addLiveCaption);
  const addCoHost = useMutation(api.gigaSocialLive.addLiveCoHost);
  const moderate = useMutation(api.gigaSocialLive.moderateLiveChat);
  const endLive = useMutation(api.gigaSocialLive.endLiveStream);
  const startLive = useMutation(api.gigaSocialLive.startLiveStream);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportNotice, setReportNotice] = useState<string | null>(null);
  const reportTarget = useMemo(() => ({ targetType: "live" as const, streamId }), [streamId]);
  const liveMediaAllowed = useRef(false);
  const [chatBody, setChatBody] = useState("");
  const [coHostHandle, setCoHostHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [fillCamera, setFillCamera] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [giftNotice, setGiftNotice] = useState("");
  const [showPreSnap, setShowPreSnap] = useState(false);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [captureModeId, setCaptureModeId] = useState<CameraCaptureModeId>("standard");
  const [mounted, setMounted] = useState(false);
  const [screenSource, setScreenSource] = useState<ScreenShareSource | null>(null);
  const [awaitingScreenShare, setAwaitingScreenShare] = useState(false);
  const [giftBusyId, setGiftBusyId] = useState<string | null>(null);
  const [chatPending, setChatPending] = useState<PendingChatMessage[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const joinedRef = useRef(false);
  const startLiveCalledRef = useRef(false);
  const hostMediaStartedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  const stream = data?.stream;
  const mode = (stream?.mode ?? "video") as LiveStreamMode;

  const stopMedia = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    recognitionRef.current = null;
    setMicOn(false); setCameraOn(false); setHasMic(false); setHasCamera(false);
  }, []);

  const startCaptions = useCallback(() => {
    const win = window as Window & {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        onresult:
          | ((event: {
              results: { [index: number]: { [index: number]: { transcript?: string } } };
            }) => void)
          | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        onresult:
          | ((event: {
              results: { [index: number]: { [index: number]: { transcript?: string } } };
            }) => void)
          | null;
        start: () => void;
        stop: () => void;
      };
    };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor || !isHost) return;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const line = event.results[event.results.length - 1]?.[0]?.transcript?.trim();
      if (line) {
        void addCaption({ sessionToken, streamId, line }).catch(() => undefined);
      }
    };
    if (recognitionRef.current) return;
    try { recognition.start(); recognitionRef.current = recognition; } catch { /* captions unavailable; capture still works */ }
  }, [addCaption, isHost, sessionToken, streamId]);

  const attachHostMedia = useCallback(
    async (media: MediaStream, source: ScreenShareSource | null) => {
      if (!liveMediaAllowed.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stopMedia();
      mediaStreamRef.current = media;
      const audioTracks = media.getAudioTracks();
      const videoTracks = media.getVideoTracks();
      setHasMic(audioTracks.length > 0); setMicOn(audioTracks.some(track => track.enabled));
      setHasCamera(videoTracks.length > 0); setCameraOn(videoTracks.some(track => track.enabled));
      setScreenSource(source);
      setAwaitingScreenShare(false);
      setMediaError(null);
      if (videoRef.current && mode !== "audio") {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
      if (source === "display") {
        media.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (mediaStreamRef.current !== media) return;
          stopMedia();
          setAwaitingScreenShare(true);
        }, { once: true });
      }
      if (liveMediaAllowed.current && audioTracks.some(track => track.enabled)) startCaptions();
    },
    [mode, startCaptions, stopMedia]
  );

  const startHostMedia = useCallback(async () => {
    if (!isHost || stream?.status !== "live") return;
    setMediaError(null);
    try {
      if (mode === "screen") {
        const handoff = takeLiveScreenShareHandoff();
        if (handoff) {
          await attachHostMedia(handoff.stream, handoff.source);
          return;
        }
        // Screen capture must start from a tap — show picker instead of auto-failing.
        setAwaitingScreenShare(true);
        return;
      }

      if (!supportsLiveCameraMic()) {
        throw new TypeError("getUserMedia is not a function");
      }
      const media = await navigator.mediaDevices.getUserMedia({
        video: mode === "video" ? LIVE_VIDEO_CAPTURE_CONSTRAINTS : false,
        audio: true,
      });
      await attachHostMedia(media, null);
    } catch (e) {
      setMediaError(getLiveMediaErrorMessage(e, mode));
      if (mode === "screen") setAwaitingScreenShare(true);
    }
  }, [attachHostMedia, isHost, mode, stream?.status]);

  const shareOsDisplay = useCallback(async () => {
    setBusy(true);
    setMediaError(null);
    try {
      const media = await requestOsDisplayCaptureStream();
      await attachHostMedia(media, "display");
    } catch (e) {
      setMediaError(getLiveMediaErrorMessage(e, "screen"));
      setAwaitingScreenShare(true);
    } finally {
      setBusy(false);
    }
  }, [attachHostMedia]);

  const shareWithRearCamera = useCallback(async () => {
    setBusy(true);
    setMediaError(null);
    try {
      const media = await requestMobileScreenShareCameraStream();
      await attachHostMedia(media, "camera");
    } catch (e) {
      setMediaError(getLiveMediaErrorMessage(e, "screen"));
      setAwaitingScreenShare(true);
    } finally {
      setBusy(false);
    }
  }, [attachHostMedia]);

  const shareFromFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setMediaError(null);
      try {
        const media = await requestMobileScreenShareFromFile(file);
        await attachHostMedia(media, "file");
      } catch (e) {
        setMediaError(getLiveMediaErrorMessage(e, "screen"));
        setAwaitingScreenShare(true);
      } finally {
        setBusy(false);
      }
    },
    [attachHostMedia]
  );

  useEffect(() => {
    if (!stream || joinedRef.current) return;
    if (stream.status === "live" && !isHost) {
      joinedRef.current = true;
      void joinLive({ sessionToken, streamId }).catch((e) => {
        setMediaError(getLiveActionErrorMessage(e));
        joinedRef.current = false;
      });
    }
  }, [isHost, joinLive, sessionToken, stream, streamId]);

  useEffect(() => {
    if (!isHost || stream?.status !== "scheduled" || startLiveCalledRef.current) return;
    startLiveCalledRef.current = true;
    void startLive({ sessionToken, streamId, mode }).catch((e) => {
      setMediaError(getLiveActionErrorMessage(e));
      startLiveCalledRef.current = false;
    });
  }, [isHost, mode, sessionToken, startLive, stream?.status, streamId]);

  useEffect(() => {
    liveMediaAllowed.current = isHost && stream?.status === "live";
    if (!liveMediaAllowed.current) {
      stopMedia();
      if (stream?.status !== "live") {
        hostMediaStartedRef.current = false;
        setAwaitingScreenShare(false);
      }
      return;
    }
    if (hostMediaStartedRef.current) return;
    hostMediaStartedRef.current = true;
    void startHostMedia();
  }, [isHost, startHostMedia, stopMedia, stream?.status]);

  useEffect(() => {
    return () => {
      liveMediaAllowed.current = false;
      stopMedia();
    };
  }, [stopMedia]);

  if (data === undefined) {
    return <LoadingState label="Joining live room…" />;
  }

  if (data === null || !stream) {
    return (
      <div className="saas-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted">This live stream is unavailable or has ended.</p>
        <Button type="button" className="mt-4 min-h-11" onClick={onClose}>
          Go back
        </Button>
      </div>
    );
  }

  async function handleSendChat(retry?: { id: string; body: string }) {
    const nextBody = (retry?.body ?? chatBody).trim();
    if (!nextBody || chatSending) return;
    const pendingId = retry?.id ?? `chat:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
    if (!retry) {
      setChatPending((prev) => [...prev, { id: pendingId, body: nextBody, status: "sending" }]);
      setChatBody("");
    } else {
      setChatPending((prev) =>
        prev.map((item) => (item.id === retry.id ? { ...item, status: "sending" } : item))
      );
    }
    setChatSending(true);
    try {
      await sendChat({ sessionToken, streamId, body: nextBody });
      setChatPending((prev) => prev.filter((item) => item.id !== pendingId));
    } catch (e) {
      setChatPending((prev) =>
        prev.map((item) =>
          item.id === pendingId ? { ...item, status: "failed" } : item
        )
      );
      setMediaError(getLiveActionErrorMessage(e));
    } finally {
      setChatSending(false);
    }
  }

  function toggleMic() {
    const tracks = mediaStreamRef.current?.getAudioTracks().filter(t => t.readyState === "live") ?? [];
    if (!tracks.length) { setMediaError("No active microphone. Retry device capture."); return; }
    const next = !tracks.some(t => t.enabled);
    tracks.forEach(t => { t.enabled = next; });
    setMicOn(next);
    if (!next) { try { recognitionRef.current?.stop(); } catch { /* already stopped */ } recognitionRef.current = null; }
    else startCaptions();
  }

  function toggleCamera() {
    const tracks = mediaStreamRef.current?.getVideoTracks().filter(t => t.readyState === "live") ?? [];
    if (!tracks.length) { setMediaError("No active camera. Retry device capture."); return; }
    const next = !tracks.some(t => t.enabled);
    tracks.forEach(t => { t.enabled = next; });
    setCameraOn(next);
  }

  async function handleSendGift(giftId: string, credits: number) {
    if (isHost || busy || giftBusyId) return;
    if (!window.confirm(`Send this gift for ${credits} credits?`)) return;
    setGiftBusyId(giftId);
    setGiftNotice("");
    setMediaError(null);
    try {
      await sendGift({
        sessionToken,
        streamId,
        giftType: giftId,
        amount: credits,
      });
      setGiftNotice("Gift sent.");
    } catch (e) {
      setMediaError(getLiveActionErrorMessage(e));
    } finally {
      setGiftBusyId(null);
    }
  }

  async function handleEnd() {
    if (isHost && stream.status === "live") {
      const confirmed = window.confirm("End this live stream for everyone?");
      if (!confirmed) return;
    }
    stopMedia();
    try {
      if (isHost && stream.status === "live") {
        await endLive({ sessionToken, streamId });
      }
    } catch {
      /* still leave the room UI */
    }
    onClose();
  }

  const showScreenPicker =
    isHost && mode === "screen" && stream.status === "live" && awaitingScreenShare;
  const previewFilter = getCameraFilterCss(filterId);
  const isCameraPreview = isHost && mode === "video";

  if (!mounted) {
    return <LoadingState label="Opening fullscreen live…" />;
  }

  return createPortal(
    <div className="gigasocial-live-stable gigasocial-live-room gigasocial-immersive-capture fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="gigasocial-live-stage relative min-h-0 flex-1 overflow-hidden bg-black">
        {stream.replayUrl && stream.status === "ended" ? (
          <video
            src={stream.replayUrl}
            controls
            className="gigasocial-live-video gigasocial-live-video--fullscreen absolute inset-0 h-full w-full object-contain bg-black"
          />
        ) : mode === "audio" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-white">
            <Radio className="h-10 w-10" aria-hidden />
            <p className="text-sm font-medium">Live audio room</p>
            <p className="text-xs text-white/90">Microphone capture stays on the host device.</p>
            <p className="text-xs text-violet-200">Chat, reactions, and gifts are active.</p>
            {isHost ? (
              <GigaSocialTeleprompter
                active={showTeleprompter}
                recording={stream.status === "live"}
              />
            ) : null}
          </div>
        ) : showScreenPicker ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-white">
            <MonitorUp className="h-10 w-10 text-violet-200" aria-hidden />
            <p className="text-sm font-medium">Choose a source for your preview</p>
            <p className="max-w-sm text-xs text-violet-100/90">{LIVE_SCREEN_SHARE_MOBILE_HINT}</p>
            <div className="mt-1 flex w-full max-w-sm flex-col gap-2">
              {supportsOsDisplayCapture() ? (
                <Button
                  type="button"
                  disabled={busy}
                  className="min-h-11 w-full"
                  onClick={() => void shareOsDisplay()}
                >
                  Share screen / window
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={busy}
                variant="outline"
                className="min-h-11 w-full border-white/30 bg-white/10 text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                Share video or screen recording
              </Button>
              <Button
                type="button"
                disabled={busy}
                variant="outline"
                className="min-h-11 w-full border-white/30 bg-white/10 text-white"
                onClick={() => void shareWithRearCamera()}
              >
                Show with rear camera
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void shareFromFile(file);
              }}
            />
          </div>
        ) : (
          <>
            {isHost ? (
              <video
                ref={videoRef}
                playsInline
                muted
                controls={false}
                className={cn(
                  "gigasocial-live-video absolute inset-0 m-auto h-full w-full bg-black object-contain",
                  isCameraPreview
                    ? "gigasocial-live-camera-preview"
                    : "gigasocial-live-video--fullscreen"
                )}
                data-fill-camera={isCameraPreview && fillCamera}
                style={mode === "video" && previewFilter ? { filter: previewFilter } : undefined}
                aria-label="Live stream preview"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                <Radio className="h-10 w-10 text-violet-200" aria-hidden />
                <p className="text-sm font-medium">Viewer playback is unavailable</p>
                <p className="max-w-sm text-sm text-white/85">You can still use room chat and reactions.</p>
              </div>
            )}
            {isHost ? (
              <GigaSocialTeleprompter
                active={showTeleprompter}
                recording={stream.status === "live"}
              />
            ) : null}
          </>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
              {isHost && stream.status === "live" ? "Host preview" : "GigaSocial Live"}
            </p>
            <h3 className="truncate text-base font-semibold text-white">{stream.title}</h3>
            <p className="text-[11px] text-white/70">
              @{stream.host.handle} · {stream.status} · {stream.viewerCount} viewers
              {isHost && screenSource ? ` · ${screenSource === "display" ? "Display" : screenSource === "file" ? "File" : "Rear camera"} preview` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!isHost ? (
              <Button type="button" size="sm" variant="outline"
                className="min-h-11 border-white/30 bg-black/70 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setReportOpen(true)}>
                Report
              </Button>
            ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleEnd()}
            className="min-h-11 shrink-0 border-white/30 bg-black/70 text-white hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
            {isHost ? "End" : "Leave"}
          </Button>
          </div>
        </div>
        {reportNotice ? <p role="status" className="absolute left-3 right-3 top-24 rounded-lg bg-black/80 p-2 text-sm">{reportNotice}</p> : null}

        {stream.captionLines?.length ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-black/70 px-3 py-2 text-sm text-white">
            <p className="text-[10px] uppercase tracking-wide text-violet-300">AI captions</p>
            <p>{stream.captionLines[stream.captionLines.length - 1]}</p>
          </div>
        ) : null}
      </div>

      {mediaError ? (
        <div className="space-y-1 bg-red-950 px-3 py-2 text-xs text-red-200">
          <p role="alert">{mediaError}</p>
        </div>
      ) : null}

      <div className="gigasocial-live-controls relative z-30 max-h-[46dvh] shrink-0 space-y-2 overflow-y-auto overscroll-contain border-t border-white/15 bg-[#101019] px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isHost && mode === "video" && showPreSnap && stream.status === "live" ? (
          <PreSnapEditBar
            filterId={filterId}
            onFilterChange={setFilterId}
            modeId={captureModeId}
            onModeChange={setCaptureModeId}
            disabled={busy}
          />
        ) : null}

        <div className="live-quick-actions">
          {isHost && stream.status === "live" && <>
            <Button type="button" size="sm" variant="outline" disabled={!hasMic} aria-pressed={micOn} className="border-white/25 bg-white/10 text-white" onClick={toggleMic}>{micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}{micOn ? "Mic on" : "Mic off"}</Button>
            {isCameraPreview && <Button type="button" size="sm" variant="outline" disabled={!hasCamera} aria-pressed={cameraOn} className="border-white/25 bg-white/10 text-white" onClick={toggleCamera}>{cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}{cameraOn ? "Camera on" : "Camera off"}</Button>}
          </>}
          <Button type="button" size="sm" variant="outline" aria-expanded={showGifts} className="border-white/25 bg-white/10 text-white" onClick={() => { setShowGifts(v => !v); setShowChatPanel(false); setShowTools(false); setShowPreSnap(false); }}><Gift className="h-5 w-5" />{isHost ? "Gifts received" : "Send gift"}</Button>
          <Button type="button" size="sm" variant="outline" aria-expanded={showChatPanel} className="border-white/25 bg-white/10 text-white" onClick={() => { setShowChatPanel(v => !v); setShowGifts(false); setShowTools(false); setShowPreSnap(false); }}><MessageCircle className="h-5 w-5" />Chat</Button>
          {isHost && <Button type="button" size="sm" variant="outline" aria-expanded={showTools} className="border-white/25 bg-white/10 text-white" onClick={() => { setShowTools(v => !v); setShowChatPanel(false); setShowGifts(false); setShowPreSnap(false); }}><SlidersHorizontal className="h-5 w-5" />More</Button>}
        </div>
        {isHost && stream.status === "live" && !hasMic && !hasCamera && mode !== "screen" && <Button type="button" size="sm" variant="outline" disabled={busy} className="border-white/25 bg-white/10 text-white" onClick={async () => { setBusy(true); try { await startHostMedia(); } finally { setBusy(false); } }}>Retry camera / microphone</Button>}
        {showTools && <div className="flex flex-wrap items-center gap-2">
          {isCameraPreview && (
            <Button type="button" size="sm" variant="outline" aria-pressed={fillCamera}
              className="min-h-11 border-white/25 bg-white/10 text-white" onClick={() => setFillCamera(value => !value)}>
              {fillCamera ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              {fillCamera ? "Fit full frame" : "Fill camera frame"}
            </Button>
          )}
          {isHost && stream.status === "live" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={showTeleprompter}
                className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setShowTeleprompter((value) => !value)}
              >
                <Type className="h-4 w-4" aria-hidden />
                {showTeleprompter ? "Hide script" : "Teleprompter"}
              </Button>
              {mode === "video" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  aria-pressed={showPreSnap}
                  onClick={() => {
                    setShowChatPanel(false);
                    setShowPreSnap((value) => !value);
                  }}
                >
                  {showPreSnap ? "Hide preview looks" : "Preview looks"}
                </Button>
              ) : null}
              {mode === "screen" && !awaitingScreenShare ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  disabled={busy}
                  onClick={() => {
                    setAwaitingScreenShare(true);
                    stopMedia();
                  }}
                >
                  Change share
                </Button>
              ) : null}
            </>
          ) : null}
        </div>}
        {showChatPanel && <div className="flex flex-wrap gap-2">{LIVE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="min-h-9 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
              onClick={() =>
                void sendReaction({ sessionToken, streamId, emoji }).catch((e) =>
                  setMediaError(getLiveActionErrorMessage(e))
                )
              }
            >
              {emoji} {getLiveReactionCount(stream.reactionCounts, emoji)}
            </button>
          ))}</div>}

        {showChatPanel ? (
          <div className="grid max-h-[34vh] gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3 sm:col-span-2">
              <p className="text-sm font-medium">
                <MessageCircle className="mr-1 inline h-4 w-4" aria-hidden />
                Live chat
              </p>
              <ul className="max-h-28 space-y-2 overflow-y-auto overscroll-contain">
                {data.chat.map((message) => (
                  <li key={message._id} className="text-sm">
                    <span className="font-medium text-white">{message.author.displayName}</span>
                    <span className="text-white/70"> {message.body}</span>
                    {isHost ? (
                      <>
                        <button
                          type="button"
                          className="ml-2 text-xs text-red-300"
                          onClick={() =>
                            void moderate({
                              sessionToken,
                              streamId,
                              messageId: message._id,
                            }).catch((e) => setMediaError(getLiveActionErrorMessage(e)))
                          }
                        >
                          Remove
                        </button>
                        {message.author.userId !== stream.host.userId ? (
                          <button
                            type="button"
                            className="ml-2 text-xs text-amber-300"
                            onClick={() =>
                              void moderate({
                                sessionToken,
                                streamId,
                                muteUserId: message.author.userId,
                              }).catch((e) => setMediaError(getLiveActionErrorMessage(e)))
                            }
                          >
                            Mute
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                ))}
                {chatPending.map((pending) => (
                  <li key={pending.id} className="text-sm">
                    <span className="font-medium text-white">You</span>
                    <span className="text-white/70"> {pending.body}</span>
                    {pending.status === "sending" ? (
                      <span className="ml-2 text-xs text-violet-200">sending…</span>
                    ) : (
                      <button
                        type="button"
                        className="ml-2 text-xs text-amber-300"
                        onClick={() => void handleSendChat({ id: pending.id, body: pending.body })}
                      >
                        Retry
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {stream.status === "live" ? (
                <div className="flex gap-2">
                  <input
                    value={chatBody}
                    onChange={(e) => setChatBody(e.target.value)}
                    placeholder="Say something…"
                    className="input-surface min-h-10 flex-1 bg-black/40 text-white"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSendChat();
                    }}
                  />
                  <Button
                    type="button"
                    disabled={chatSending}
                    onClick={() => void handleSendChat()}
                    className="min-h-10"
                  >
                    {chatSending ? "Sending…" : "Send"}
                  </Button>
                </div>
              ) : null}
            </div>
            {isHost ? (
              <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
                <p className="text-sm font-medium">
                  <Shield className="mr-1 inline h-4 w-4" aria-hidden />
                  Host moderation
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={coHostHandle}
                    onChange={(e) => setCoHostHandle(e.target.value)}
                    placeholder="Add co-host @handle"
                    className="input-surface min-h-9 flex-1 bg-black/40 text-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-11 border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    disabled={!coHostHandle.trim()}
                    onClick={() =>
                      void addCoHost({ sessionToken, streamId, coHostHandle })
                        .then(() => setCoHostHandle(""))
                        .catch((e) => setMediaError(getLiveActionErrorMessage(e)))
                    }
                  >
                    <Users className="h-4 w-4" aria-hidden />
                    Co-host
                  </Button>
                </div>
              </div>
            ) : null}


          </div>
        ) : null}
        {showGifts && <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
          <p className="text-sm font-semibold">{isHost ? "Recent gifts received" : "Send a gift · credits"}</p>
          {isHost ? (data.gifts.length ? <ul className="max-h-32 overflow-y-auto space-y-1">{data.gifts.map((gift, i) => <li key={i} className="text-xs text-white/90">{gift.sender.displayName} sent {LIVE_GIFTS.find(item => item.id === gift.giftType)?.emoji ?? "🎁"} {gift.giftType} · {gift.amount} credits</li>)}</ul> : <p className="text-xs text-white/70">No gifts received yet.</p>) : <div className="grid grid-cols-2 gap-2">{LIVE_GIFTS.map(gift => <Button key={gift.id} type="button" variant="outline" disabled={giftBusyId !== null || stream.status !== "live"} className="min-h-11 border-white/30 bg-white/10 text-white" onClick={() => void handleSendGift(gift.id, gift.credits)}>{gift.emoji} {gift.label} · {gift.credits}</Button>)}</div>}
          {giftNotice && <p role="status" className="text-xs text-emerald-300">{giftNotice}</p>}
        </div>}
      </div>
      <GigaSocialReportDialog open={reportOpen} sessionToken={sessionToken} target={reportTarget}
        title="Report live stream" onClose={() => setReportOpen(false)} onSubmitted={setReportNotice} />
    </div>,
    document.body
  );
});
