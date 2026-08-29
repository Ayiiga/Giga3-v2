"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import dynamic from "next/dynamic";

const CreatorStudioClient = dynamic(
  () =>
    import("@/components/creator-studio/CreatorStudioClient").then((m) => ({
      default: m.CreatorStudioClient,
    })),
  { ssr: false, loading: () => <LoadingState label="Loading Creator Studio…" /> }
);

export function CreatorPageRoot() {
  return <CreatorStudioClient />;
}
