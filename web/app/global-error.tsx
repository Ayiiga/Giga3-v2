"use client";

import { isChunkLoadError, recoverFromStaleChunks } from "@/lib/pwa/chunkLoadRecovery";

/**
 * Root error boundary — catches failures outside route-level boundaries
 * (e.g. missing chunk while opening chat/GigaSocial offline).
 * Uses plain HTML so it still renders if UI chunks failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  const message =
    error?.message && !/chunk|dynamically imported|module script/i.test(error.message)
      ? "Something went wrong loading this page."
      : chunkError
        ? offline
          ? "This screen needs a cached copy from a previous online visit."
          : "The app was updated. Refresh to load the latest version."
        : "Something went wrong loading this page.";

  const btnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "8px 16px",
    borderRadius: 12,
    border: "1px solid #3a4553",
    background: "#1a2330",
    color: "#e8eef6",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    cursor: "pointer",
  } as const;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0b0f14",
          color: "#e8eef6",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, margin: "0 0 12px" }}>
            {message}
          </p>
          {offline ? (
            <p style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.7, margin: "0 0 20px" }}>
              Open Chat or GigaSocial once while online so this device can keep a local
              copy, then reopen offline.
            </p>
          ) : null}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {chunkError && !offline ? (
              <button
                type="button"
                style={{ ...btnStyle, background: "#2563eb", borderColor: "#2563eb" }}
                onClick={() => void recoverFromStaleChunks()}
              >
                Refresh app
              </button>
            ) : (
              <button
                type="button"
                style={{ ...btnStyle, background: "#2563eb", borderColor: "#2563eb" }}
                onClick={() => reset()}
              >
                Try again
              </button>
            )}
            <a href="/" style={btnStyle}>
              Back to home
            </a>
            {offline ? (
              <>
                <a href="/chat/" style={btnStyle}>
                  Open chat
                </a>
                <a href="/gigasocial/" style={btnStyle}>
                  Open GigaSocial
                </a>
              </>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  );
}
