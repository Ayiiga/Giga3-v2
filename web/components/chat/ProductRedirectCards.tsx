"use client";

import { CHAT_WORKSPACE_PRIMARY_APPS } from "@/lib/chat/workspaceApps";
import type { Giga3ChatProduct } from "../../../convex/giga3Products";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Building2,
  Clapperboard,
  Compass,
  CreditCard,
  Library,
  Sparkles,
  Store,
  UsersRound,
  Video,
  Wallet,
  Wand2,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { memo } from "react";

type ProductVisual = {
  icon: LucideIcon;
  gradient: string;
  badge: string;
};

const FALLBACK_VISUAL: ProductVisual = {
  icon: Sparkles,
  gradient: "from-zinc-500 to-zinc-700",
  badge: "Open",
};

const PRODUCT_VISUALS: Record<string, ProductVisual> = {
  gigasocial: { icon: UsersRound, gradient: "from-sky-500 to-emerald-500", badge: "Social" },
  gigaedit: { icon: Clapperboard, gradient: "from-amber-500 to-orange-600", badge: "Edit" },
  gigalearn: { icon: BookOpen, gradient: "from-violet-600 to-indigo-600", badge: "Learn" },
  media: { icon: Sparkles, gradient: "from-fuchsia-500 to-violet-600", badge: "Create" },
  video: { icon: Video, gradient: "from-rose-500 to-orange-500", badge: "Video" },
  marketplace: { icon: Store, gradient: "from-emerald-500 to-teal-600", badge: "Shop" },
  "creator-studio": { icon: Wand2, gradient: "from-pink-500 to-violet-500", badge: "Create" },
  discover: { icon: Compass, gradient: "from-cyan-500 to-sky-600", badge: "Explore" },
  pricing: { icon: CreditCard, gradient: "from-amber-500 to-yellow-600", badge: "Plans" },
  wallet: { icon: Wallet, gradient: "from-lime-500 to-emerald-600", badge: "Wallet" },
  enterprise: { icon: Building2, gradient: "from-slate-500 to-slate-700", badge: "Teams" },
  prompts: { icon: Library, gradient: "from-indigo-500 to-blue-600", badge: "Prompts" },
  automation: { icon: Workflow, gradient: "from-zinc-500 to-neutral-700", badge: "Auto" },
};

function visualFor(product: Giga3ChatProduct): ProductVisual {
  const fromPrimary = CHAT_WORKSPACE_PRIMARY_APPS.find(
    (app) => app.id === product.id || (product.id === "media" && app.id === "media-studio")
  );
  if (fromPrimary) {
    return {
      icon: fromPrimary.icon,
      gradient: fromPrimary.gradient,
      badge: fromPrimary.badge,
    };
  }
  return PRODUCT_VISUALS[product.id] ?? FALLBACK_VISUAL;
}

type ProductRedirectCardsProps = {
  products: Giga3ChatProduct[];
};

export const ProductRedirectCards = memo(function ProductRedirectCards({
  products,
}: ProductRedirectCardsProps) {
  if (products.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2" data-testid="product-redirect-cards">
      {products.map((product) => {
        const visual = visualFor(product);
        const Icon = visual.icon;
        return (
          <Link
            key={product.id}
            href={product.href}
            className="flex min-h-[3.5rem] w-full items-center gap-3 rounded-xl border border-accent/30 bg-card p-3 text-left ring-1 ring-accent/10"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
                visual.gradient
              )}
            >
              <Icon className="h-5 w-5 text-white" aria-hidden />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold tracking-tight text-foreground">
                Open {product.label}
              </span>
              <span className="mt-0.5 block line-clamp-2 text-xs font-medium leading-snug text-muted">
                {product.hint}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              {visual.badge}
            </span>
          </Link>
        );
      })}
    </div>
  );
});
