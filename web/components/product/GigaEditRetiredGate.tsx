"use client";

import { RetiredProductNotice } from "@/components/product/RetiredProductNotice";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { RETIRED_PRODUCTS } from "@/lib/navigation/retiredProducts";
import { withChunkRetryLoader } from "@/lib/pwa/dynamicWithChunkRetry";
import dynamic from "next/dynamic";
import { Suspense, useSearchParams } from "next/navigation";

const GigaEditPageRoot = dynamic(
  withChunkRetryLoader(() =>
    import("@/components/gigaedit/GigaEditPageRoot").then((m) => ({
      default: m.GigaEditPageRoot,
    }))
  ),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="Local editor" /> }
);

const meta = RETIRED_PRODUCTS.find((p) => p.id === "gigaedit")!;

/** Deep links and ?continue=1 keep device-local IndexedDB projects reachable. */
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

function GigaEditRetiredGateInner() {
  const params = useSearchParams();
  if (hasEditorHandoff(params)) {
    return (
      <div className="gigaedit-page gigaedit-stable px-3 pb-3 pt-4 sm:px-4 sm:pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="Local editor" />}>
          <GigaEditPageRoot />
        </Suspense>
      </div>
    );
  }
  return (
    <RetiredProductNotice
      formerName={meta.formerName}
      summary={`${meta.summary} Open your device drafts with the local editor link below if needed.`}
      extraHref="/gigaedit/?continue=1"
      extraLabel="Open local editor (device drafts)"
    />
  );
}

/** Bare /gigaedit shows retirement; deep links preserve local project access. */
export function GigaEditRetiredGate() {
  return (
    <Suspense fallback={<ClientAppHydrationNotice productName="Local editor" />}>
      <GigaEditRetiredGateInner />
    </Suspense>
  );
}
