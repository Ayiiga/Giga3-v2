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
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ButtonLink href="/credits" size="lg" className="w-full">
          Try again
        </ButtonLink>
        <ButtonLink href="/pricing" variant="secondary" size="lg" className="w-full">
          View pricing
        </ButtonLink>
      </div>
    </div>
  );
}
