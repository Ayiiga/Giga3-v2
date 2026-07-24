"use client";

import { GigaSocialLiveRoom } from "@/components/gigasocial/live/GigaSocialLiveRoom";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  getLiveMediaErrorMessage,
  LIVE_SCREEN_SHARE_MOBILE_HINT,
  LIVE_STREAM_MODES,
  supportsLiveScreenShare,
  type LiveStreamMode,
} from "@/lib/gigasocial/liveStreaming";
import {
  isLikelyMobileLiveDevice,
  requestOsDisplayCaptureStream,
  stashLiveScreenShareStream,
  stopLiveScreenShareHandoff,
  supportsOsDisplayCapture,
} from "@/lib/gigasocial/liveScreenShare";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Calendar, Radio, Video } from "lucide-react";
import { memo, useState } from "react";

export const GigaSocialLivePanel = memo(function GigaSocialLivePanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const live = useQuery(api.gigaSocialLive.listLiveStreams, { status: "live" });
  const scheduled = useQuery(api.gigaSocialLive.listLiveStreams, { status: "scheduled" });
  const replays = useQuery(api.gigaSocialLive.listLiveStreams, {
    status: "ended",
    limit: 10,
  });
  const myStreams = useQuery(api.gigaSocialLive.getMyLiveStreams, { sessionToken });

  const scheduleLive = useMutation(api.gigaSocialLive.scheduleLiveStream);
  const startLive = useMutation(api.gigaSocialLive.startLiveStream);

  const [activeStreamId, setActiveStreamId] = useState<Id<"socialLiveStreams"> | null>(null);
  const [hosting, setHosting] = useState(false);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<LiveStreamMode>("video");
  const [scheduleAt, setScheduleAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveStreams = live?.streams ?? [];
  const scheduledStreams = scheduled?.streams ?? [];
  const replayStreams = replays?.streams ?? [];
  const myStreamList = myStreams?.streams ?? [];

  const listsLoading = live === undefined || scheduled === undefined || replays === undefined;

  if (activeStreamId) {
    return (
      <GigaSocialLiveRoom
        sessionToken={sessionToken}
        streamId={activeStreamId}
        isHost={hosting}
        onClose={() => {
          setActiveStreamId(null);
          setHosting(false);
          stopLiveScreenShareHandoff();
        }}
      />
    );
  }

  if (listsLoading) {
    return <LoadingState label="Loading live streams…" />;
  }

  async function handleGoLive() {
    if (mode === "screen" && !supportsLiveScreenShare()) {
      setError(
        isLikelyMobileLiveDevice()
          ? LIVE_SCREEN_SHARE_MOBILE_HINT
          : "Screen share is unavailable in this browser."
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Acquire OS display capture during the tap (required user gesture).
      if (mode === "screen" && supportsOsDisplayCapture()) {
        try {
          const display = await requestOsDisplayCaptureStream();
          stashLiveScreenShareStream(display, "display");
        } catch (e) {
          // Phones often lack a working OS picker — continue into the room for
          // gallery / rear-camera share instead of hard-failing.
          if (!isLikelyMobileLiveDevice()) {
            setError(getLiveMediaErrorMessage(e, "screen"));
            setBusy(false);
            return;
          }
        }
      }

      const result = await startLive({
        sessionToken,
        title: title.trim() || "GigaSocial Live",
        mode,
      });
      setHosting(true);
      setActiveStreamId(result.streamId);
    } catch (e) {
      stopLiveScreenShareHandoff();
      setError(e instanceof Error ? e.message : "Could not start live stream.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleAt) {
      setError("Pick a schedule date and time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await scheduleLive({
        sessionToken,
        title: title.trim() || "Scheduled GigaSocial Live",
        mode,
        scheduledAt: new Date(scheduleAt).getTime(),
      });
      setTitle("");
      setScheduleAt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule stream.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gigasocial-live-stable space-y-6">
      <div className="saas-card rounded-2xl border border-border bg-white p-4">
        <h3 className="text-base font-semibold text-foreground">Go live on GigaSocial</h3>
        <p className="mt-1 text-sm text-muted">
          Broadcast vertical 9:16 video, audio, or your screen with live chat, reactions, gifts,
          moderation, and AI captions.
        </p>
        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Stream title"
            className="input-surface w-full"
            maxLength={120}
          />
          <div className="flex flex-wrap gap-2">
            {LIVE_STREAM_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.description}
                onClick={() => {
                  setError(null);
                  setMode(item.id);
                }}
                className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  mode === item.id
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-border text-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {mode === "screen" ? (
            <p className="text-xs text-muted">
              {isLikelyMobileLiveDevice()
                ? LIVE_SCREEN_SHARE_MOBILE_HINT
                : "You’ll be asked to choose a screen, window, or tab when you go live."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void handleGoLive()} className="min-h-10">
              <Radio className="mr-1.5 h-4 w-4" aria-hidden />
              Go live now
            </Button>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="input-surface min-h-10 flex-1"
              aria-label="Schedule stream"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleSchedule()}
              className="min-h-10"
            >
              <Calendar className="mr-1.5 h-4 w-4" aria-hidden />
              Schedule
            </Button>
          </div>
          {error ? (
            <p className="text-xs text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <StreamSection
        title="Live now"
        empty="No one is live right now. Be the first to go live!"
        streams={liveStreams}
        onJoin={(id) => {
          setHosting(false);
          setActiveStreamId(id);
        }}
      />

      <StreamSection
        title="Scheduled"
        empty="No scheduled streams yet."
        streams={scheduledStreams}
        onJoin={(id) => {
          setHosting(false);
          setActiveStreamId(id);
        }}
        showSchedule
      />

      <StreamSection
        title="Replays"
        empty="Ended streams with replays will appear here."
        streams={replayStreams}
        onJoin={(id) => {
          setHosting(false);
          setActiveStreamId(id);
        }}
        showReplay
      />

      {myStreamList.length > 0 ? (
        <StreamSection
          title="Your streams"
          empty=""
          streams={myStreamList}
          onJoin={(id) => {
            setHosting(true);
            setActiveStreamId(id);
          }}
        />
      ) : null}
    </div>
  );
});

function StreamSection({
  title,
  empty,
  streams,
  onJoin,
  showSchedule,
  showReplay,
}: {
  title: string;
  empty: string;
  streams: Array<{
    _id: Id<"socialLiveStreams">;
    title: string;
    mode: string;
    status: string;
    viewerCount: number;
    scheduledAt?: number;
    host: { displayName: string; handle: string };
    replayUrl?: string;
  }>;
  onJoin: (id: Id<"socialLiveStreams">) => void;
  showSchedule?: boolean;
  showReplay?: boolean;
}) {
  return (
    <section>
      <h4 className="platform-section-title mb-3">{title}</h4>
      {streams.length === 0 ? (
        empty ? <EmptyState icon={Video} title={empty} description="" /> : null
      ) : (
        <ul className="space-y-3">
          {streams.map((stream) => (
            <li key={stream._id} className="saas-card rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{stream.title}</p>
                  <p className="text-xs text-muted">
                    @{stream.host?.handle ?? "host"} · {stream.mode} · {stream.status}
                    {stream.viewerCount > 0 ? ` · ${stream.viewerCount} watching` : ""}
                  </p>
                  {showSchedule && stream.scheduledAt ? (
                    <p className="mt-1 text-xs text-muted">
                      {new Date(stream.scheduledAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <Button type="button" size="sm" className="min-h-9" onClick={() => onJoin(stream._id)}>
                  {showReplay && stream.replayUrl ? "Watch replay" : stream.status === "scheduled" ? "View" : "Join"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
