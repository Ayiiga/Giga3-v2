import { describe, expect, it } from "vitest";
import {
  buildShellViewportStyles,
  composerScrollOverflowPx,
  isComposerDockClipped,
  isMobileChatWidth,
  keyboardInsetPx,
} from "../../web/lib/chat/keyboardViewport";

describe("keyboardViewport helpers", () => {
  it("computes keyboard inset from layout vs visual viewport", () => {
    expect(keyboardInsetPx(800, { height: 800, offsetTop: 0 })).toBe(0);
    expect(keyboardInsetPx(800, { height: 500, offsetTop: 0 })).toBe(300);
    expect(keyboardInsetPx(800, { height: 500, offsetTop: 40 })).toBe(260);
    expect(keyboardInsetPx(800, null)).toBe(0);
  });

  it("builds shell styles from visual viewport", () => {
    expect(
      buildShellViewportStyles({
        offsetTop: 12,
        offsetLeft: 0,
        width: 390,
        height: 640,
      })
    ).toEqual({
      top: "12px",
      left: "0px",
      width: "390px",
      height: "640px",
      maxHeight: "640px",
    });
  });

  it("detects clipped composer and scroll overflow", () => {
    const viewport = { offsetTop: 0, offsetLeft: 0, width: 390, height: 500 };
    expect(isComposerDockClipped(498, viewport)).toBe(false);
    expect(isComposerDockClipped(510, viewport)).toBe(true);
    expect(composerScrollOverflowPx(510, viewport, 8)).toBe(18);
  });

  it("classifies mobile chat widths", () => {
    expect(isMobileChatWidth(1023)).toBe(true);
    expect(isMobileChatWidth(1024)).toBe(false);
  });
});
