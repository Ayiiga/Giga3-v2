"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import dynamic from "next/dynamic";

const GigaLearnClient = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnClient").then((m) => ({
      default: m.GigaLearnClient,
    })),
  { ssr: false, loading: () => <LoadingState label="Loading GigaLearn…" /> }
);

export function GigaLearnPageRoot() {
  return <GigaLearnClient />;
}
