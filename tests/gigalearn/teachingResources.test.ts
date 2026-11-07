import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("GigaLearn teaching materials library", () => {
  it("adds a separate JHS/SHS resource catalogue without replacing exam banks", () => {
    const schema = read("convex/schema.ts");
    expect(schema).toContain("teachingResources: defineTable");
    expect(schema).toContain("teachingResourceDownloadTokens: defineTable");
    expect(schema).toContain('v.literal("jhs")');
    expect(schema).toContain('v.literal("shs")');
    const practice = read("web/components/gigalearn/exam/ExamPracticeHub.tsx");
    expect(practice).toContain("Teaching Materials & Practical Resources");
    expect(practice).toContain("examPracticeHref");
    expect(practice).toContain("Teacher Promotion");
    const examSelection = practice.indexOf('aria-labelledby="exam-select-title"');
    const practiceStart = practice.indexOf('data-testid="start-practice-test"');
    const materialsPreview = practice.indexOf('aria-labelledby="featured-resources-title"');
    expect(examSelection).toBeGreaterThanOrEqual(0);
    expect(practiceStart).toBeGreaterThan(examSelection);
    expect(materialsPreview).toBeGreaterThan(practiceStart);
  });

  it("requires platform administrator authentication for publishing and uploads", () => {
    const backend = read("convex/teachingResources.ts");
    expect(backend).toContain("isPlatformAdminEmail(email)");
    expect(backend).toContain("createResource = mutation");
    expect(backend).toContain("createUploadUrl = mutation");
    expect(backend).toContain("attachResourceFile = mutation");
    expect(backend).toContain("seedStarterResources = mutation");
  });

  it("rechecks subscription validity before issuing and consuming protected download tokens", () => {
    const backend = read("convex/teachingResources.ts");
    expect(backend).toContain("isSubscriptionActive");
    expect(backend).toContain("hasActiveSubscriptionAccess");
    expect(backend).toContain('q.eq("userId", email).eq("status", "active")');
    expect(backend).toContain("subscription.periodEnd > now");
    expect(backend).toContain("issueDownloadToken = mutation");
    expect(backend).toContain("consumeDownloadToken = internalMutation");
    expect(backend).toContain("row.expiresAt <= Date.now()");
    expect(backend).toContain("row.consumedAt");
    expect(backend).toContain('Cache-Control": "private, no-store"');
  });

  it("keeps the resource page connected to server catalogue queries", () => {
    const ui = read("web/components/gigalearn/TeachingResourcesLibrary.tsx");
    expect(ui).toContain("api.teachingResources.listPublished");
    expect(ui).toContain("api.teachingResources.getPublicDetail");
    expect(ui).toContain("api.teachingResources.issueDownloadToken");
    expect(ui).toContain("window.print()");
    expect(ui).toContain("sessionReady");
    expect(ui).toContain("Checking your subscription and loading resource details");
    expect(ui).not.toContain("</p>\\n          {!detail.fullAccess");
  });
});
