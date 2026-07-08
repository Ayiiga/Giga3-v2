import { httpAction } from "./_generated/server";

/** Public liveness probe — no auth, no PII. Used by uptime monitors and deploy smoke tests. */
export const healthCheck = httpAction(async () => {
  const body = JSON.stringify({
    ok: true,
    service: "giga3-convex",
    version: 1,
    ts: Date.now(),
  });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
});
