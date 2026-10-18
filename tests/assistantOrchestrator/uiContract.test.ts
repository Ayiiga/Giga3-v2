import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveChatCreateRoute } from "@/lib/chat/chatCreateMenu";

describe("executive assistant UI contracts", () => {
  it("routes Discover/Plus executive assistant to automation assistant tab", () => {
    expect(resolveChatCreateRoute("executive-assistant")).toEqual({
      kind: "navigate",
      href: "/automation/?tab=assistant",
    });
  });

  it("wires Assistant tab into automation page", () => {
    const src = readFileSync(
      resolve(__dirname, "../../web/components/automation/AutomationPageClient.tsx"),
      "utf8"
    );
    expect(src).toContain("ExecutiveAssistantPanel");
    expect(src).toContain('"assistant"');
  });

  it("reuses connector invoke from orchestration engine", () => {
    const src = readFileSync(
      resolve(__dirname, "../../convex/assistantOrchestrator/engine.ts"),
      "utf8"
    );
    expect(src).toContain("api.connectors.operations.invoke");
    expect(src).toContain("requireSession(args.sessionToken, ctx)");
    expect(src).toContain("awaiting_confirmation");
  });
});
