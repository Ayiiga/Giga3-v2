import {
  BadgeCheck,
  BarChart3,
  Boxes,
  ChevronRight,
  CirclePlus,
  MessageSquareText,
  Store,
} from "lucide-react";

const toolGroups = [
  {
    title: "Grow your business",
    tools: [
      { label: "Catalogue", description: "Manage and share your listings", id: "seller-catalogue", Icon: Boxes },
      { label: "Add a product", description: "List a digital or physical product", id: "seller-new-product", Icon: CirclePlus },
      { label: "Sales and payouts", description: "Review digital sales and payout requests", id: "seller-sales", Icon: BarChart3 },
    ],
  },
  {
    title: "Talk to customers",
    tools: [
      { label: "Buyer enquiries", description: "Reply with availability and delivery quotes", id: "seller-inbox", Icon: MessageSquareText },
    ],
  },
  {
    title: "Manage your account",
    tools: [
      { label: "Store profile", description: "Update your public storefront", id: "seller-profile", Icon: Store },
      { label: "Verification", description: "Check your seller verification status", id: "seller-verification", Icon: BadgeCheck },
    ],
  },
];

export function MarketplaceSellerTools({ unanswered }: { unanswered?: number }) {
  return (
    <nav aria-label="Seller tools" className="grid items-start gap-4 lg:grid-cols-3">
      {toolGroups.map(({ title, tools }) => (
        <section key={title} className="rounded-2xl border border-border bg-card">
          <h2 className="px-4 pb-2 pt-4 text-sm font-semibold text-foreground">{title}</h2>
          <ul className="divide-y divide-border px-2 pb-2">
            {tools.map(({ label, description, id, Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex min-h-16 items-center gap-3 rounded-lg px-2 py-2.5 text-foreground hover:bg-violet-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600"
                >
                  <Icon className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="block text-xs leading-relaxed text-muted">{description}</span>
                  </span>
                  {id === "seller-inbox" && Boolean(unanswered) ? (
                    <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900" aria-label={`${unanswered} awaiting reply`}>
                      {unanswered}
                    </span>
                  ) : null}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
