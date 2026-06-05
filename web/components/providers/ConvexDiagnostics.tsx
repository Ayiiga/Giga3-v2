"use client";

import {
  isConvexProbeEnabled,
  recordConnectionState,
} from "@/lib/debug/convexProbe";
import { useConvexConnectionState } from "convex/react";
import { useEffect } from "react";

/** Logs Convex WS connection metrics when ?convexProbe=1. */
export function ConvexDiagnostics() {
  const state = useConvexConnectionState();

  useEffect(() => {
    if (!isConvexProbeEnabled()) return;
    recordConnectionState(state);
  }, [state]);

  return null;
}
