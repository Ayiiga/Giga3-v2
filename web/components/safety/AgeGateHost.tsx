"use client";

import { AgeGateModal } from "@/components/safety/AgeGateModal";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";

/** Lazy-safe mount for age attestation (Convex hooks inside shell). */
export function AgeGateHost() {
  return (
    <ConvexAppShell>
      <AgeGateModal />
    </ConvexAppShell>
  );
}
