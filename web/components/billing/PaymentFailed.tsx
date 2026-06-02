import { ButtonLink } from "@/components/ui/Button";
import { XCircle } from "lucide-react";

interface PaymentFailedProps {
  title?: string;
  message: string;
  reference?: string;
}

export function PaymentFailed({
  title = "Payment failed",
  message,
  reference,
}: PaymentFailedProps) {
  return (
    <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <XCircle className="mx-auto h-14 w-14 text-red-400" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">{message}</p>
      {reference && (
        <p className="mt-2 font-mono text-xs text-muted">Ref: {reference}</p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/credits">Try again</ButtonLink>
        <ButtonLink href="/pricing" variant="secondary">
          View pricing
        </ButtonLink>
      </div>
    </div>
  );
}
