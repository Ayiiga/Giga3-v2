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
  loadingLabel?: string;
  disabled?: boolean;
}

export function SubscriptionCard({
  product,
  features,
  onSelect,
  loading,
  loadingLabel = "Subscribe with Paystack",
  disabled,
}: SubscriptionCardProps) {
  return (
    <article
      className={cn(
        "saas-card flex flex-col p-6 sm:p-8",
        product.highlighted && "ring-1 ring-accent/25"
      )}
    >
      {product.highlighted && (
        <span className="mb-3 w-fit rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          Recommended
        </span>
      )}
      <h3 className="text-lg font-semibold text-foreground">{product.label}</h3>
      <p className="mt-2 text-2xl font-semibold text-foreground">{formatGhs(product.amountGhs)}</p>
      <p className="mt-2 text-sm leading-[1.7] text-muted">{product.description}</p>
      <ul className="mt-6 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-sm leading-[1.7]">
            <Check className="mt-1 shrink-0 text-accent" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        size="lg"
        className="mt-8 w-full"
        variant={product.highlighted ? "primary" : "secondary"}
        disabled={disabled || loading}
        onClick={() => onSelect(product.id)}
      >
        {loading ? loadingLabel : "Subscribe with Paystack"}
      </Button>
    </article>
  );
}
