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
      className="flex flex-col items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 sm:flex-row sm:justify-between"
      role="alert"
    >
      <p className="text-center sm:text-left">{message}</p>
      <div className="flex shrink-0 gap-2">
        {onRetry && (
          <button
            type="button"
            className="rounded-lg bg-red-100 px-3 py-1.5 font-bold text-red-900 hover:bg-red-200"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 font-semibold text-red-800 hover:bg-red-100"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
