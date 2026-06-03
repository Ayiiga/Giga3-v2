import { ButtonLink } from "@/components/ui/Button";
import { CheckCircle2 } from "lucide-react";

interface PaymentSuccessProps {
  title?: string;
  message: string;
  reference?: string;
}

export function PaymentSuccess({
  title = "Payment successful",
  message,
  reference,
}: PaymentSuccessProps) {
  return (
    <div className="glass mx-auto max-w-md rounded-2xl p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-muted">{message}</p>
      {reference && (
        <p className="mt-2 font-mono text-xs text-muted">Ref: {reference}</p>
      )}
      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ButtonLink href="/chat" size="lg" className="w-full">
          Open chat
        </ButtonLink>
        <ButtonLink href="/media" variant="secondary" size="lg" className="w-full">
          Create media
        </ButtonLink>
      </div>
    </div>
  );
}
