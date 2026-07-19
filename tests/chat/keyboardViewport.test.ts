import { describe, expect, it } from "vitest";
import {
  applyChatKeyboardCssVars,
  buildShellViewportStyles,
  clearChatKeyboardCssVars,
  composerScrollOverflowPx,
  isComposerDockClipped,
  isKeyboardLikelyOpen,
  isMobileChatWidth,
  keyboardInsetPx,
  measureComposerVisibility,
  measureKeyboardInset,
  readVisualViewportRect,
} from "../../web/lib/chat/keyboardViewport";

describe("keyboardViewport helpers", () => {
  it("computes keyboard inset from layout vs visual viewport", () => {
    expect(keyboardInsetPx(800, { height: 800, offsetTop: 0 })).toBe(0);
    expect(keyboardInsetPx(800, { height: 500, offsetTop: 0 })).toBe(300);
    expect(keyboardInsetPx(800, { height: 500, offsetTop: 40 })).toBe(260);
    expect(keyboardInsetPx(800, null)).toBe(0);
  });

  it("falls back to layout viewport height when visual inset is zero", () => {
    expect(measureKeyboardInset(800, { height: 800, offsetTop: 0 }, 800)).toBe(0);
    expect(measureKeyboardInset(800, { height: 800, offsetTop: 0 }, 520)).toBe(280);
    expect(measureKeyboardInset(800, { height: 500, offsetTop: 0 }, 520)).toBe(300);
    expect(measureKeyboardInset(800, null, 520)).toBe(280);
  });

  it("applies and clears keyboard CSS variables on the document root", () => {
    const properties: Record<string, string> = {};
    const el = {
      style: {
        setProperty: (name: string, value: string) => {
          properties[name] = value;
        },
        removeProperty: (name: string) => {
          delete properties[name];
        },
        getPropertyValue: (name: string) => properties[name] ?? "",
      },
    } as unknown as HTMLElement;

    applyChatKeyboardCssVars(el, 240, 96);
    expect(el.style.getPropertyValue("--chat-keyboard-inset")).toBe("240px");
    expect(el.style.getPropertyValue("--chat-composer-dock-height")).toBe("96px");
    clearChatKeyboardCssVars(el);
    expect(el.style.getPropertyValue("--chat-keyboard-inset")).toBe("");
    expect(el.style.getPropertyValue("--chat-composer-dock-height")).toBe("");
  });

  it("detects likely keyboard open state", () => {
    expect(isKeyboardLikelyOpen(800, { height: 800, offsetTop: 0 })).toBe(false);
    expect(isKeyboardLikelyOpen(800, { height: 700, offsetTop: 0 })).toBe(true);
    expect(isKeyboardLikelyOpen(800, { height: 730, offsetTop: 0 })).toBe(false);
    expect(isKeyboardLikelyOpen(800, { height: 500, offsetTop: 0 })).toBe(true);
  });

  it("reads visual viewport rects", () => {
    expect(
      readVisualViewportRect({
        offsetTop: 12,
        offsetLeft: 4,
        width: 390,
        height: 640,
      })
    ).toEqual({
      offsetTop: 12,
      offsetLeft: 4,
      width: 390,
      height: 640,
    });
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
      position: "fixed",
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
    expect(measureComposerVisibility(510, viewport, 8)).toEqual({
      clipped: true,
      overflowPx: 18,
    });
  });

  it("classifies mobile chat widths", () => {
    expect(isMobileChatWidth(1023)).toBe(true);
    expect(isMobileChatWidth(1024)).toBe(false);
  });
});
