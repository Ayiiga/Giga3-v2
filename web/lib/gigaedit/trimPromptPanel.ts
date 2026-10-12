/**
 * Playhead-trim confirmation panel visibility (D1 / M1).
 * Cancel must remain available whenever trim mode is open — including gap/miss targets.
 */

export type TrimPromptPanelState = {
  open: boolean;
  showNeedsClipStatus: boolean;
  showConfirm: boolean;
  showCancel: boolean;
};

export const TRIM_NEEDS_CLIP_STATUS = "Move the playhead onto a video clip to trim.";

export function trimPromptPanelState(
  trimPromptOpen: boolean,
  hasTrimTarget: boolean
): TrimPromptPanelState {
  if (!trimPromptOpen) {
    return {
      open: false,
      showNeedsClipStatus: false,
      showConfirm: false,
      showCancel: false,
    };
  }
  return {
    open: true,
    showNeedsClipStatus: !hasTrimTarget,
    showConfirm: hasTrimTarget,
    showCancel: true,
  };
}
