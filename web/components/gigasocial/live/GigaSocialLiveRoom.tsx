"use client";

import { PreSnapEditBar } from "@/components/gigasocial/studio/PreSnapEditBar";
import { GigaSocialTeleprompter } from "@/components/gigasocial/studio/GigaSocialTeleprompter";
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
import { Gift, MessageCircle, MonitorUp, Radio, Shield, Type, Users, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  const [chatBody, setChatBody] = useState("");
  const [coHostHandle, setCoHostHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [showPreSnap, setShowPreSnap] = useState(true);
  const [filterId, setFilterId] = useState<CameraFilterId>("none");
  const [captureModeId, setCaptureModeId] = useState<CameraCaptureModeId>("standard");
  const [mounted, setMounted] = useState(false);
  const [screenSource, setScreenSource] = useState<ScreenShareSource | null>(null);
  const [awaitingScreenShare, setAwaitingScreenShare] = useState(false);
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
    recognitionRef.current?.stop();
    recognitionRef.current = null;
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
    recognition.start();
    recognitionRef.current = recognition;
  }, [addCaption, isHost, sessionToken, streamId]);

  const attachHostMedia = useCallback(
    async (media: MediaStream, source: ScreenShareSource | null) => {
      stopMedia();
      mediaStreamRef.current = media;
      setScreenSource(source);
      setAwaitingScreenShare(false);
      setMediaError(null);
      if (videoRef.current && mode !== "audio") {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
      startCaptions();
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
        setMediaError(getLiveMediaErrorMessage(e, "camera"));
        joinedRef.current = false;
      });
    }
  }, [isHost, joinLive, sessionToken, stream, streamId]);

  useEffect(() => {
    if (!isHost || stream?.status !== "scheduled" || startLiveCalledRef.current) return;
    startLiveCalledRef.current = true;
    void startLive({ sessionToken, streamId, mode }).catch((e) => {
      setMediaError(getLiveMediaErrorMessage(e, "camera"));
      startLiveCalledRef.current = false;
    });
  }, [isHost, mode, sessionToken, startLive, stream?.status, streamId]);

  useEffect(() => {
    if (!isHost || stream?.status !== "live") {
      if (stream?.status !== "live") {
        hostMediaStartedRef.current = false;
        setAwaitingScreenShare(false);
      }
      return;
    }
    if (hostMediaStartedRef.current) return;
    hostMediaStartedRef.current = true;
    void startHostMedia();
  }, [isHost, startHostMedia, stream?.status]);

  useEffect(() => {
    return () => stopMedia();
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

  async function handleSendChat() {
    if (!chatBody.trim() || busy) return;
    setBusy(true);
    try {
      await sendChat({ sessionToken, streamId, body: chatBody });
      setChatBody("");
    } catch (e) {
      setMediaError(getLiveMediaErrorMessage(e, "camera"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
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
            <p className="text-sm font-medium">Share your screen on this phone</p>
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
            <video
              ref={videoRef}
              playsInline
              muted={isHost}
              controls={!isHost}
              className={cn(
                "gigasocial-live-video gigasocial-live-video--fullscreen absolute inset-0 h-full w-full bg-black",
                mode === "screen" ? "object-contain" : "object-cover"
              )}
              style={
                isHost && mode === "video" && previewFilter
                  ? { filter: previewFilter }
                  : undefined
              }
              aria-label="Live stream preview"
            />
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
              GigaSocial Live · fullscreen
            </p>
            <h3 className="truncate text-base font-semibold text-white">{stream.title}</h3>
            <p className="text-[11px] text-white/70">
              @{stream.host.handle} · {stream.status} · {stream.viewerCount} viewers
              {stream.peakViewers > 0 ? ` · peak ${stream.peakViewers}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleEnd()}
            className="min-h-9 shrink-0 border-white/30 bg-black/40 text-white"
          >
            <X className="h-4 w-4" aria-hidden />
            {isHost ? "End" : "Leave"}
          </Button>
        </div>

        {stream.captionLines?.length ? (
          <div className="absolute inset-x-3 bottom-44 rounded-xl bg-black/70 px-3 py-2 text-sm text-white">
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

      <div className="space-y-2 border-t border-white/10 bg-black/90 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isHost && mode === "video" && showPreSnap && stream.status === "live" ? (
          <PreSnapEditBar
            filterId={filterId}
            onFilterChange={setFilterId}
            modeId={captureModeId}
            onModeChange={setCaptureModeId}
            disabled={busy}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {isHost && stream.status === "live" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant={showTeleprompter ? "primary" : "outline"}
                className="min-h-9"
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
                  className="min-h-9"
                  onClick={() => setShowPreSnap((value) => !value)}
                >
                  {showPreSnap ? "Hide looks" : "Pre-live looks"}
                </Button>
              ) : null}
              {mode === "screen" && !awaitingScreenShare ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-9"
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-9"
            onClick={() => setShowChatPanel((value) => !value)}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {showChatPanel ? "Hide chat" : "Chat"}
          </Button>
          {LIVE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="min-h-9 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
              onClick={() =>
                void sendReaction({ sessionToken, streamId, emoji }).catch(() => undefined)
              }
            >
              {emoji} {getLiveReactionCount(stream.reactionCounts, emoji)}
            </button>
          ))}
        </div>

        {showChatPanel ? (
          <div className="grid max-h-[34vh] gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2">
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
                    className="min-h-9"
                    onClick={() =>
                      void addCoHost({ sessionToken, streamId, coHostHandle })
                        .then(() => setCoHostHandle(""))
                        .catch((e) => setMediaError(getLiveMediaErrorMessage(e, "camera")))
                    }
                  >
                    <Users className="h-4 w-4" aria-hidden />
                    Co-host
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-sm font-medium">
                <Gift className="mr-1 inline h-4 w-4" aria-hidden />
                Send a gift
              </p>
              <div className="flex flex-wrap gap-2">
                {LIVE_GIFTS.map((gift) => (
                  <Button
                    key={gift.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-9"
                    onClick={() =>
                      void sendGift({
                        sessionToken,
                        streamId,
                        giftType: gift.id,
                        amount: gift.credits,
                      }).catch((e) => setMediaError(getLiveMediaErrorMessage(e, "camera")))
                    }
                  >
                    {gift.emoji} {gift.label}
                  </Button>
                ))}
              </div>
            </div>

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
                      <button
                        type="button"
                        className="ml-2 text-xs text-red-300"
                        onClick={() =>
                          void moderate({
                            sessionToken,
                            streamId,
                            messageId: message._id,
                          }).catch(() => undefined)
                        }
                      >
                        Remove
                      </button>
                    ) : null}
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
                    disabled={busy}
                    onClick={() => void handleSendChat()}
                    className="min-h-10"
                  >
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
});
