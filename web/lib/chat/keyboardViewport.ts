/** Mobile chat breakpoint — matches Tailwind `lg` and chat CSS media queries. */
export const MOBILE_CHAT_MAX_WIDTH = 1023;

export type VisualViewportRect = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
};

export type ShellViewportStyles = {
  top: string;
  left: string;
  width: string;
  height: string;
  maxHeight: string;
};

export function keyboardInsetPx(
  innerHeight: number,
  viewport: Pick<VisualViewportRect, "height" | "offsetTop"> | null
): number {
  if (!viewport) return 0;
  return Math.max(0, innerHeight - viewport.height - viewport.offsetTop);
}

export function buildShellViewportStyles(viewport: VisualViewportRect): ShellViewportStyles {
  return {
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
