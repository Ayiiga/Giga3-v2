"use client";

import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";
import { useEffect } from "react";

/** Global listener — auto-reload once when a stale Next.js chunk fails to load. */
export function ChunkLoadRecoveryBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;

    const handleChunkFailure = (err: unknown) => {
      if (!isChunkLoadError(err)) return;
      void recoverFromStaleChunks();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      event.preventDefault();
      handleChunkFailure(event.reason);
    };

    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error ?? event.message)) return;
      event.preventDefault();
      handleChunkFailure(event.error ?? event.message);
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
