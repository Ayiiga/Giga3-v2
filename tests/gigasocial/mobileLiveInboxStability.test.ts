import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LIVE_VIDEO_CAPTURE_CONSTRAINTS } from "../../web/lib/gigasocial/liveStreaming";

const read = (path: string) => readFileSync(path, "utf8");
describe("mobile live and inbox stability", () => {
  it("keeps the camera's native frame as the default and offers an explicit fill option", () => {
    const room = read("web/components/gigasocial/live/GigaSocialLiveRoom.tsx");
    const css = read("web/styles/interface.css");
    expect(room).toContain("const [fillCamera, setFillCamera] = useState(false)");
    expect(css).toMatch(/data-fill-camera="false"[^}]*object-fit:contain/);
    expect(LIVE_VIDEO_CAPTURE_CONSTRAINTS.aspectRatio).toBeUndefined();
  });
  it("uses actual capture tracks for microphone and camera toggles", () => {
    const room = read("web/components/gigasocial/live/GigaSocialLiveRoom.tsx");
    expect(room).toContain("getAudioTracks().filter");
    expect(room).toContain("getVideoTracks().filter");
    expect(room).toContain("t.enabled = next");
    expect(room).toContain("captureInFlight.current");
  });
  it("exposes received gifts to hosts and confirms viewer credit spending", () => {
    const room = read("web/components/gigasocial/live/GigaSocialLiveRoom.tsx");
    expect(room).toContain("Recent gifts received");
    expect(room).toContain("data.gifts.map");
    expect(room).toContain("window.confirm");
    expect(room).toContain("Viewer playback is unavailable");
  });
  it("sets a dark summary surface with readable controls", () => {
    const panel = read("web/components/gigasocial/GigaSocialNotificationsPanel.tsx");
    expect(panel).toContain("gigasocial-inbox-summary");
    expect(read("web/styles/interface.css")).toContain("gigasocial-inbox-summary {background:#211b35!important");
  });
  it("aggregates gallery progress and cancels sibling uploads on failure", () => {
    const composer = read("web/components/gigasocial/GigaSocialComposer.tsx");
    const upload = read("web/lib/gigasocial/mediaUpload.ts");
    expect(composer).toContain("photoProgress.reduce");
    expect(composer).toContain("next <= previous");
    expect(upload).toContain("Math.min(2, files.length)");
    expect(upload).toContain("Promise.allSettled");
    expect(upload).toContain("controller.abort()");
  });
});
