/** Fire-and-forget 404 telemetry from the client not-found page. */
export async function onRequest(context) {
  let path = "";
  let ref = "";
  try {
    if (context.request.method === "POST") {
      const body = await context.request.json();
      path = String(body?.path || "");
      ref = String(body?.ref || "");
    } else {
      const url = new URL(context.request.url);
      path = url.searchParams.get("path") || "";
      ref = url.searchParams.get("ref") || "";
    }
  } catch {
    /* ignore malformed body */
  }
  console.log(JSON.stringify({ kind: "client_404", path, ref, ts: Date.now() }));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
