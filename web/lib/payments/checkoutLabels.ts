import type { CheckoutPhase } from "@/components/billing/CheckoutOverlay";

export function paystackButtonLabel(
  phase: CheckoutPhase,
  idleLabel: string
): string {
  switch (phase) {
    case "preparing":
      return "Starting checkout…";
    case "opening":
      return "Opening Paystack…";
    case "popup":
      return "Complete in Paystack window";
    case "verifying":
      return "Confirming payment…";
    default:
      return idleLabel;
  }
}
