"use client";

import { siteConfig } from "@/lib/site";
import Link from "next/link";

interface CreditPromptLinksProps {
  creditCost: number;
  subscriptionActive?: boolean;
  className?: string;
}

/** Compact inline subscribe / buy-credits links for tool panels. */
export function CreditPromptLinks({
  creditCost,
  subscriptionActive = false,
  className,
}: CreditPromptLinksProps) {
  return (
    <p className={className}>
      Need {creditCost} credit{creditCost === 1 ? "" : "s"}.{" "}
      <Link href={subscriptionActive ? siteConfig.links.credits : siteConfig.links.subscribe} className="font-medium text-accent underline">
        {subscriptionActive ? "Buy credits" : "Subscribe"}
      </Link>
      {" · "}
      <Link href={siteConfig.links.credits} className="font-medium text-accent underline">
        Buy credits
      </Link>
    </p>
  );
}
