"use client";

type MicPermissionSheetProps = {
  open: boolean;
  onRetry: () => void;
  onDismiss: () => void;
};

export function MicPermissionSheet({ open, onRetry, onDismiss }: MicPermissionSheetProps) {
  if (!open) return null;

  return (
    <div className="gigaedit-mic-sheet-backdrop" role="presentation" onClick={onDismiss}>
      <div
        className="gigaedit-mic-sheet"
        role="dialog"
        aria-label="Microphone blocked"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-sm font-semibold text-white">Microphone blocked</p>
        <p className="mt-2 text-xs leading-relaxed text-white/75">
          GigaEdits needs mic access for voiceover. On Android Chrome: tap the lock icon in the
          address bar → Permissions → Microphone → Allow, then return here.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--sm flex-1"
            onClick={onRetry}
          >
            Enable mic
          </button>
          <button
            type="button"
            className="gigaedit-cta gigaedit-cta--ghost gigaedit-cta--sm"
            onClick={onDismiss}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
