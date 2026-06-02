import {
  buildMessagesForProvider,
  getModeDefinition,
  isValidMode,
  type AiModeId,
} from "@/lib/aiRouter";
import { getAiProvider } from "@/lib/ai/providers";
import type { ChatMessage } from "@/lib/ai/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ChatRequestBody {
  message: string;
  mode?: string;
  history?: ChatMessage[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const mode: AiModeId = body.mode && isValidMode(body.mode) ? body.mode : "general";
    const history = (body.history ?? []).filter(
      (m) => m.role === "user" || m.role === "assistant"
    );

    const messages = buildMessagesForProvider(mode, history, message);
    const provider = getAiProvider();
    const result = await provider.complete({ messages });

    return NextResponse.json({
      content: result.content,
      mode,
      modeLabel: getModeDefinition(mode).label,
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    console.error("[api/chat]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
