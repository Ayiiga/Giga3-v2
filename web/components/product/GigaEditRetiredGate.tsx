"use client";

import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { Container } from "@/components/ui/Container";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const GigaEditPageRoot = dynamic(
  () =>
    import("@/components/gigaedit/GigaEditPageRoot").then((m) => ({
      default: m.GigaEditPageRoot,
    })),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="Local editor" /> }
);

const meta = RETIRED_PRODUCTS.find((p) => p.id === "gigaedit")!;

function hasEditorHandoff(params: URLSearchParams): boolean {
  return Boolean(
    params.get("tab") ||
      params.get("project") ||
      params.get("import") ||
      params.get("record") ||
      params.get("aspect") ||
      params.get("continue") === "1"
  );
}

function notice() {
  return (
    <RetiredProductNotice
      formerName={meta.formerName}
      summary={`${meta.summary} Open your device drafts with the local editor link below if needed.`}
      extraHref="/gigaedit/?continue=1"
      extraLabel="Open local editor (device drafts)"
    />
  );
}

function GigaEditRetiredGateInner() {
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hasEditorHandoff(params)) {
    return notice();
  }

  return (
    <div className="gigaedit-page gigaedit-stable px-3 pb-3 pt-4 sm:px-4 sm:pb-6 sm:pt-6">
      <Container className="!px-0">
        <GigaEditPageRoot />
      </Container>
    </div>
  );
}

/** Bare /gigaedit shows retirement; deep links preserve local project access. */
export function GigaEditRetiredGate() {
  return (
    <Suspense fallback={notice()}>
      <GigaEditRetiredGateInner />
    </Suspense>
  );
}
