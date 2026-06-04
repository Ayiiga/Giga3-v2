"use client";

interface BillingErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function BillingErrorBanner({
  message,
  onDismiss,
  onRetry,
}: BillingErrorBannerProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 sm:flex-row sm:justify-between"
      role="alert"
    >
      <p className="text-center sm:text-left">{message}</p>
      <div className="flex shrink-0 gap-2">
        {onRetry && (
          <button
            type="button"
            className="rounded-lg bg-red-500/20 px-3 py-1.5 font-medium hover:bg-red-500/30"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-red-200/90 hover:bg-red-500/15"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
