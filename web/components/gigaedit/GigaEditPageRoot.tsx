"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import dynamic from "next/dynamic";

const GigaEditClient = dynamic(
  () =>
    import("@/components/gigaedit/GigaEditClient").then((m) => ({
      default: m.GigaEditClient,
    })),
  { ssr: false, loading: () => <LoadingState label="Loading GigaEdit…" /> }
);

export function GigaEditPageRoot() {
  return <GigaEditClient />;
}
