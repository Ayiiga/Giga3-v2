"use client";

import { applyGigaLiteDocumentClass } from "@/lib/network/gigaLite";
import { useEffect } from "react";

/** Applies persisted Giga Lite / data-saver document classes on every app load. */
export function GigaLiteBootstrap() {
  useEffect(() => {
    applyGigaLiteDocumentClass();
  }, []);

  return null;
}
