"use node";

import { geminiGenerateWithGrounding } from "./webSearch";
import type { VerificationVerdict } from "./researchCapabilities";

export type ChatVerificationResult = {
  verdict: VerificationVerdict;
  confidence: "high" | "medium" | "low";
  summary: string;
  reasons: string[];
  claim: string;
  trustedSources: Array<{ title: string; uri: string }>;
  checkedAt: number;
};

const VALID_VERDICTS = new Set<VerificationVerdict>([
  "confirmed",
  "partially_true",
  "misleading",
  "false",
  "insufficient_evidence",
  "developing",
]);

function parseChatVerificationJson(
  text: string
): Omit<ChatVerificationResult, "trustedSources" | "checkedAt" | "claim"> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      verdict: "insufficient_evidence",
      confidence: "low",
      summary: text.slice(0, 500),
      reasons: ["Could not parse a structured verification verdict."],
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      verdict?: string;
      confidence?: string;
      summary?: string;
      reasons?: string[];
    };
    const verdict = VALID_VERDICTS.has(parsed.verdict as VerificationVerdict)
      ? (parsed.verdict as VerificationVerdict)
      : "insufficient_evidence";
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";
    return {
      verdict,
      confidence,
      summary: (parsed.summary ?? text).slice(0, 900),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map((r) => String(r).slice(0, 400)).slice(0, 6)
        : ["No detailed reasons returned."],
    };
  } catch {
    return {
      verdict: "insufficient_evidence",
      confidence: "low",
      summary: text.slice(0, 500),
      reasons: ["Verification response was not valid JSON."],
    };
  }
}

export function extractClaimFromQuery(query: string): string {
  const trimmed = query.trim();
  const quoted = trimmed.match(/["“](.+?)["”]/);
  if (quoted?.[1]) return quoted[1].slice(0, 2000);
  return trimmed.slice(0, 2000);
}

export async function verifyChatClaim(args: {
  claim: string;
  context?: string;
  imageNote?: string;
}): Promise<ChatVerificationResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Fact verification is temporarily unavailable.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const claim = extractClaimFromQuery(args.claim);
  const contextLine = args.context?.trim()
    ? `\nAdditional context:\n${args.context.trim().slice(0, 1500)}`
    : "";
  const imageLine = args.imageNote?.trim()
    ? `\nImage note: ${args.imageNote.trim().slice(0, 500)}`
    : "";

  const grounded = await geminiGenerateWithGrounding({
    apiKey,
    model,
    enableWebSearch: true,
    timeoutMs: 45_000,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content: `You are a careful fact-checking assistant for Giga3 AI.
Use current web sources. Compare the claim against primary sources, reputable news outlets, and fact-check organizations when relevant.
Respond with JSON only (no markdown fences):
{
  "verdict": "confirmed" | "partially_true" | "misleading" | "false" | "insufficient_evidence" | "developing",
  "confidence": "high" | "medium" | "low",
  "summary": "2-5 sentences explaining the evidence",
  "reasons": ["reason 1", "reason 2"]
}
Rules:
- confirmed = well-supported by multiple credible independent sources
- partially_true = mix of accurate and inaccurate elements
- misleading = technically contains truth but omits critical context
- false = contradicted by credible sources
- insufficient_evidence = not enough reliable evidence to decide
- developing = story still unfolding with conflicting early reports
- Never invent sources; rely on search grounding results
- Do not label FALSE merely because a claim cannot be found
- Do not label TRUE merely because one website says so`,
      },
      {
        role: "user",
        content: `Verify this claim:\n"${claim}"${contextLine}${imageLine}`,
      },
    ],
  });

  const parsed = parseChatVerificationJson(grounded.text);
  return {
    ...parsed,
    claim,
    trustedSources: grounded.sources.slice(0, 8),
    checkedAt: Date.now(),
  };
}

export function formatVerificationContextBlock(result: ChatVerificationResult): string {
  const lines = [
    "FACT VERIFICATION CONTEXT (from live web research):",
    `Claim: ${result.claim}`,
    `Verdict: ${result.verdict}`,
    `Confidence: ${result.confidence}`,
    `Summary: ${result.summary}`,
    "Reasons:",
    ...result.reasons.map((r) => `- ${r}`),
  ];
  if (result.trustedSources.length) {
    lines.push("", "Sources consulted:");
    for (const [i, source] of result.trustedSources.entries()) {
      lines.push(`[V${i + 1}] ${source.title} — ${source.uri}`);
    }
  }
  lines.push(
    "",
    "Present the verdict clearly with the emoji label matching the verdict, explain evidence, and cite sources."
  );
  return lines.join("\n");
}
