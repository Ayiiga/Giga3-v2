import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckCircle2, Loader2 } from "lucide-react";

interface PaymentSuccessProps {
  title?: string;
  message: string;
  reference?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  pending?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

export function PaymentSuccess({
  title = "Payment successful",
  message,
  reference,
  primaryHref = "/chat",
  primaryLabel = "Open chat",
  secondaryHref = "/media",
  secondaryLabel = "Create media",
  pending = false,
  onRetry,
  retrying = false,
}: PaymentSuccessProps) {
  const Icon = pending ? Loader2 : CheckCircle2;
  const iconClass = pending
    ? "mx-auto h-14 w-14 animate-spin text-amber-400"
    : "mx-auto h-14 w-14 text-emerald-400";

  return (
    <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <Icon className={iconClass} aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">{message}</p>
      {reference && (
        <p className="mt-2 font-mono text-xs text-muted">Ref: {reference}</p>
      )}
      {onRetry ? (
        <div className="mt-10">
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={retrying}
            onClick={onRetry}
          >
            {retrying ? "Checking payment…" : "Check payment again"}
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ButtonLink href={primaryHref} size="lg" className="w-full">
            {primaryLabel}
          </ButtonLink>
          <ButtonLink href={secondaryHref} variant="secondary" size="lg" className="w-full">
            {secondaryLabel}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
