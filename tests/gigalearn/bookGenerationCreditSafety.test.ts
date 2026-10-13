import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CREDIT_COSTS } from "../../convex/creditsConfig";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

/**
 * Contract tests for book/creation generation credit safety.
 * Live authenticated charge/refund flows require GIGA3_E2E_* credentials
 * and are marked BLOCKED in the verification report when unavailable.
 */
describe("book / creation generation credit-safety contracts", () => {
  it("frontend stage cost matches CREDIT_COSTS.writing", () => {
    const builder = read("web/components/gigalearn/creation/CreationBuilder.tsx");
    expect(CREDIT_COSTS.writing).toBe(2);
    expect(builder).toMatch(/STAGE_CREDIT_COST\s*=\s*2/);
    expect(builder).toContain("insufficientCredits");
    expect(builder).toContain("credits < STAGE_CREDIT_COST");
  });

  it("builder blocks generate when credits are insufficient (including autostart)", () => {
    const builder = read("web/components/gigalearn/creation/CreationBuilder.tsx");
    expect(builder).toContain("if (!insufficientCredits) confirmAndGenerate()");
    expect(builder).toContain("generatingRef");
    expect(builder).toContain("if (generatingRef.current) return");
  });

  it("generation hook requires session and maps to gigalearnStudio.generateContent", () => {
    const hook = read("web/hooks/useCreationGeneration.ts");
    expect(hook).toContain("api.gigalearnStudio.generateContent");
    expect(hook).toContain("getSessionToken()");
    expect(hook).toContain('setError("Session expired. Please sign in again.")');
    expect(hook).toContain("creditsUsed: 2");
  });

  it("backend generateContent enforces session, entitlement, and credit gate before AI", () => {
    const src = read("convex/gigalearnStudio.ts");
    const handlerIdx = src.indexOf("export const generateContent = action");
    expect(handlerIdx).toBeGreaterThan(-1);
    const slice = src.slice(handlerIdx, handlerIdx + 4500);
    expect(slice).toContain("requireSessionWithMonitoring");
    expect(slice).toContain('feature: "creator_studio"');
    expect(slice).toContain("getUsageSnapshot");
    expect(slice).toContain("CREDIT_COSTS.writing");
    expect(slice).toContain("Insufficient credits");
    const checkIdx = slice.indexOf("usage.credits < CREDIT_COSTS.writing");
    const completeIdx = slice.indexOf("completeChatWithFailover");
    const deductIdx = slice.indexOf("deductCredits");
    expect(checkIdx).toBeGreaterThan(-1);
    expect(completeIdx).toBeGreaterThan(checkIdx);
    expect(deductIdx).toBeGreaterThan(completeIdx);
  });

  it("deductCredits re-checks balance atomically and requires a session", () => {
    const credits = read("convex/credits.ts");
    expect(credits).toContain("async function performDeduct");
    expect(credits).toContain("if (balance < cost)");
    expect(credits).toContain("Insufficient credits");
    expect(credits).toMatch(/export const deductCredits = mutation/);
    const deduct = credits.slice(credits.indexOf("export const deductCredits = mutation"));
    expect(deduct).toContain("requireSession(args.sessionToken, ctx)");
    expect(deduct).toContain("performDeduct");
  });

  it("empty prompts fail before credit deduction", () => {
    const src = read("convex/gigalearnStudio.ts");
    const emptyIdx = src.indexOf('throw new Error("Please describe what you want to learn or create.")');
    const deductIdx = src.indexOf('await ctx.runMutation(api.credits.deductCredits');
    expect(emptyIdx).toBeGreaterThan(-1);
    expect(deductIdx).toBeGreaterThan(emptyIdx);
  });

  it("local_fallback responses do not deduct credits", () => {
    const src = read("convex/gigalearnStudio.ts");
    expect(src).toContain('engineResult.providerId !== "local_fallback"');
    expect(src).toMatch(
      /if \(engineResult\.providerId !== "local_fallback"\) \{\s*await ctx\.runMutation\(api\.credits\.deductCredits/
    );
  });

  it("book template routes through creation-book backend tool id", () => {
    const templates = read("web/lib/gigalearn/creation/templates.ts");
    expect(templates).toContain('id: "book"');
    expect(templates).toContain('backendToolId: "creation-book"');
  });

  it("chat intake confirmation never calls generation or credits itself", () => {
    const intake = read("web/lib/gigalearn/creation/chatIntake.ts");
    expect(intake).not.toContain("deductCredits");
    expect(intake).not.toContain("generateContent");
    expect(intake).toContain("navigateTo");
    expect(intake).toContain("autostart");
  });
});
