"use client";

/**
 * Slow-network tip was removed from the chrome so intermittent cellular
 * connections do not interrupt the app. Chat/media already adapt timings
 * via useConnectionQuality without a visible banner.
 */
export function GlobalSlowNetworkBanner() {
  return null;
}
