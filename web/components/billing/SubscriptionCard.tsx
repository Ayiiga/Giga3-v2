import { Button } from "@/components/ui/Button";
import { formatGhs } from "@/lib/payments/plans";
import type { PaymentProduct } from "@/lib/payments/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SubscriptionCardProps {
  product: PaymentProduct;
  features: readonly string[];
  onSelect: (productId: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function SubscriptionCard({
  product,
  features,
  onSelect,
  loading,
  disabled,
}: SubscriptionCardProps) {
  return (
    <article
      className={cn(
        "glass flex flex-col rounded-2xl p-6",
        product.highlighted && "border-violet-500/50 shadow-lg shadow-violet-500/10"
      )}
    >
      {product.highlighted && (
        <span className="mb-3 w-fit rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
          Recommended
        </span>
      )}
      <h3 className="text-lg font-semibold">{product.label}</h3>
      <p className="mt-2 text-3xl font-bold">{formatGhs(product.amountGhs)}</p>
      <p className="mt-2 text-sm text-muted">{product.description}</p>
      <ul className="mt-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm">
            <Check className="app-icon mt-0.5 text-accent" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        className="mt-6 w-full"
        variant={product.highlighted ? "primary" : "secondary"}
        disabled={disabled || loading}
        onClick={() => onSelect(product.id)}
      >
        {loading ? "Redirecting…" : "Subscribe with Paystack"}
      </Button>
    </article>
  );
}
