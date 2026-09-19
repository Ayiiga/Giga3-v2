/** Fire-and-forget 404 telemetry from the client not-found page. */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.searchParams.get("path") || "";
  const ref = url.searchParams.get("ref") || "";
  console.log(JSON.stringify({ kind: "client_404", path, ref, ts: Date.now() }));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
