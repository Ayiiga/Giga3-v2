/** Mobile chat breakpoint — matches Tailwind `lg` and chat CSS media queries. */
export const MOBILE_CHAT_MAX_WIDTH = 1023;

/** Max animation frames to chase keyboard open animations (~800ms at 60fps). */
export const COMPOSER_VISIBILITY_MAX_FRAMES = 48;

/** CSS custom properties applied on `html.chat-route` during keyboard sync. */
export const CHAT_KEYBOARD_INSET_VAR = "--chat-keyboard-inset";
export const CHAT_COMPOSER_DOCK_HEIGHT_VAR = "--chat-composer-dock-height";

/** Default composer dock height when not yet measured (mobile typing bar + input). */
export const DEFAULT_COMPOSER_DOCK_HEIGHT_PX = 88;

export type VisualViewportRect = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
};

export type ShellViewportStyles = {
  position: "fixed";
  top: string;
  left: string;
  width: string;
  height: string;
  maxHeight: string;
};

export function readVisualViewportRect(
  viewport: Pick<VisualViewport, "offsetTop" | "offsetLeft" | "width" | "height">
): VisualViewportRect {
  return {
    offsetTop: viewport.offsetTop,
    offsetLeft: viewport.offsetLeft,
    width: viewport.width,
    height: viewport.height,
  };
}

export function keyboardInsetPx(
  innerHeight: number,
  viewport: Pick<VisualViewportRect, "height" | "offsetTop"> | null
): number {
  if (!viewport) return 0;
  return Math.max(0, innerHeight - viewport.height - viewport.offsetTop);
}

/**
 * Best-effort keyboard inset for Android PWAs where visualViewport may not shrink
 * with `interactive-widget=overlays-content`. Falls back to layout viewport height
 * and an optional pre-keyboard baseline height captured on composer focus.
 */
export function measureKeyboardInset(
  innerHeight: number,
  viewport: Pick<VisualViewportRect, "height" | "offsetTop"> | null,
  layoutHeight?: number,
  baselineHeight?: number
): number {
  const fromVisual = keyboardInsetPx(innerHeight, viewport);
  let inset = fromVisual;

  if (layoutHeight !== undefined && layoutHeight > 0) {
    const fromLayout = Math.max(0, innerHeight - layoutHeight);
    if (fromLayout >= 80) inset = Math.max(inset, fromLayout);
  }

  if (baselineHeight !== undefined && baselineHeight > 0 && viewport) {
    const fromBaseline = Math.max(0, baselineHeight - viewport.height - viewport.offsetTop);
    if (fromBaseline >= 80) inset = Math.max(inset, fromBaseline);
  } else if (baselineHeight !== undefined && baselineHeight > 0) {
    const fromBaselineInner = Math.max(0, baselineHeight - innerHeight);
    if (fromBaselineInner >= 80) inset = Math.max(inset, fromBaselineInner);
  }

  return inset;
}

/**
 * When `interactive-widget=resizes-content` already shrunk the layout viewport to
 * match the visual viewport, a fixed composer should sit at bottom:0 — lifting by
 * the full keyboard inset would double-compensate and push the input too high.
 */
export function resolveComposerBottomInset(
  insetPx: number,
  layoutHeight: number,
  viewport: Pick<VisualViewportRect, "height"> | null,
  tolerancePx = 24
): number {
  if (!viewport || insetPx <= 0) return Math.max(0, insetPx);
  const layoutMatchesVisual = Math.abs(layoutHeight - viewport.height) <= tolerancePx;
  return layoutMatchesVisual ? 0 : Math.max(0, insetPx);
}

/** Heuristic: soft keyboard is likely open when visual viewport is materially shorter. */
export function isKeyboardLikelyOpen(
  innerHeight: number,
  viewport: Pick<VisualViewportRect, "height" | "offsetTop"> | null,
  thresholdPx = 80,
  baselineHeight?: number
): boolean {
  if (keyboardInsetPx(innerHeight, viewport) >= thresholdPx) return true;
  if (baselineHeight !== undefined && baselineHeight > 0 && viewport) {
    return baselineHeight - viewport.height - viewport.offsetTop >= thresholdPx;
  }
  return false;
}

export function buildShellViewportStyles(viewport: VisualViewportRect): ShellViewportStyles {
  return {
    position: "fixed",
    top: `${viewport.offsetTop}px`,
    left: `${viewport.offsetLeft}px`,
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    maxHeight: `${viewport.height}px`,
  };
}

/** True when the composer dock extends below the visible visual viewport. */
export function isComposerDockClipped(
  composerBottom: number,
  viewport: VisualViewportRect,
  tolerancePx = 2
): boolean {
  const visibleBottom = viewport.offsetTop + viewport.height;
  return composerBottom > visibleBottom + tolerancePx;
}

export function composerScrollOverflowPx(
  composerBottom: number,
  viewport: VisualViewportRect,
  paddingPx = 8
): number {
  const visibleBottom = viewport.offsetTop + viewport.height;
  return Math.max(0, composerBottom - visibleBottom + paddingPx);
}

export function isMobileChatWidth(width: number): boolean {
  return width <= MOBILE_CHAT_MAX_WIDTH;
}

export type ComposerVisibilitySnapshot = {
  clipped: boolean;
  overflowPx: number;
};

export function measureComposerVisibility(
  composerBottom: number,
  viewport: VisualViewportRect,
  paddingPx = 8
): ComposerVisibilitySnapshot {
  const clipped = isComposerDockClipped(composerBottom, viewport);
  return {
    clipped,
    overflowPx: clipped ? composerScrollOverflowPx(composerBottom, viewport, paddingPx) : 0,
  };
}

export function applyChatKeyboardCssVars(
  root: HTMLElement,
  insetPx: number,
  composerDockHeightPx: number
): void {
  root.style.setProperty(CHAT_KEYBOARD_INSET_VAR, `${Math.max(0, insetPx)}px`);
  root.style.setProperty(
    CHAT_COMPOSER_DOCK_HEIGHT_VAR,
    `${Math.max(0, composerDockHeightPx)}px`
  );
}

export function clearChatKeyboardCssVars(root: HTMLElement): void {
  root.style.removeProperty(CHAT_KEYBOARD_INSET_VAR);
  root.style.removeProperty(CHAT_COMPOSER_DOCK_HEIGHT_VAR);
}
