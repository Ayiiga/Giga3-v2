"use client";

import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { Container } from "@/components/ui/Container";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const MediaPageRoot = dynamic(
  () =>
    import("@/components/media/MediaPageRoot").then((m) => ({
      default: m.MediaPageRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="Image tools" />,
  }
);

const meta = RETIRED_PRODUCTS.find((p) => p.id === "media")!;

function hasImageHandoff(params: URLSearchParams): boolean {
  return Boolean(
    params.get("action") ||
      params.get("template") ||
      params.get("source") ||
      params.get("prompt") ||
      params.get("category") ||
      params.get("tab") ||
      params.get("continue") === "1"
  );
}

function MediaRetiredGateInner() {
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Static export prerenders without query params — keep the notice SSR-safe.
  if (!mounted || !hasImageHandoff(params)) {
    return <RetiredProductNotice formerName={meta.formerName} summary={meta.summary} />;
  }

  return (
    <div className="media-stable w-full max-w-full px-3 pb-3 pt-4 sm:px-6 sm:pb-6 sm:pt-6">
      <Container className="!px-0">
        <MediaPageRoot />
      </Container>
    </div>
  );
}

/** Bare /media shows retirement; query handoffs keep AI Assistant image workflows. */
export function MediaRetiredGate() {
  return (
    <Suspense fallback={<RetiredProductNotice formerName={meta.formerName} summary={meta.summary} />}>
      <MediaRetiredGateInner />
    </Suspense>
  );
}
