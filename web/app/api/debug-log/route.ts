import { appendFile } from "node:fs/promises";

export const runtime = "nodejs";

type DebugPayload = {
  hypothesisId?: string;
  location?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as DebugPayload;
  const entry = {
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data,
    timestamp: payload.timestamp ?? Date.now(),
  };

  await appendFile("/opt/cursor/logs/debug.log", `${JSON.stringify(entry)}\n`);
  return new Response(null, { status: 204 });
}
