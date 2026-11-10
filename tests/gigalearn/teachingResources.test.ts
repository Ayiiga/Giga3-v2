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
    expect(backend).toContain("isSubscriber: active");
    expect(backend).toContain("Viewing remains free");
    expect(backend).toContain("const fullAccess = true");
    expect(backend).toContain("consumeDownloadToken = internalMutation");
    expect(backend).toContain("row.expiresAt <= Date.now()");
    expect(backend).toContain("row.consumedAt");
    expect(backend).toContain('Cache-Control": "private, no-store"');
  });

  it("keeps the resource page connected to server catalogue queries", () => {
    const ui = read("web/components/gigalearn/TeachingResourcesLibrary.tsx");
    expect(ui).toContain("api.teachingResources.listPublished");
    expect(ui).toContain("Quick access · Science collections");
    expect(ui).toContain("JHS laboratory set-ups");
    expect(ui).toContain("9 human body systems");
    expect(ui).toContain("Easy image upload — choose the resource, then choose its photo");
    expect(ui).toContain("Choose resource for image upload");
    expect(ui).toContain("normalise(r.title) === fileKey");
    expect(ui).toContain("Publish / update complete Science Aids Library");
    const backend = read("convex/teachingResources.ts");
    expect(backend).toContain('"Laboratory Set-ups"');
    expect(backend).toContain('"Human Biology"');
    expect(backend).toContain("human-endocrine-system-glands-and-functions");
    expect(backend).toContain("human-reproductive-system-organs-and-functions");
    expect(backend).toContain('["Filtration set-up","filtration-set-up"');
    expect(backend).toContain("let restored = 0");
    expect(backend).toContain("status: \"published\"");
    expect(backend).toContain("existing resources refreshed/published");
    expect(ui).toContain("function ResourceVisual");
    expect(ui).toContain("function ResourceDiagram");
    expect(ui).toContain("aspect-[9/16]");
    expect(ui).toContain("Pinch with two fingers to zoom");
    expect(ui).toContain("COMPOUND LIGHT MICROSCOPE");
    expect(ui).toContain("Liquid column");
    expect(ui).toContain("https://commons.wikimedia.org/w/api.php");
    expect(ui).toContain("Source & licence");
    expect(ui).toContain("Download original");
    expect(ui).toContain("useCommonsImage");
    expect(ui).toContain("Open full material & illustration");
    expect(ui).toContain("api.teachingResources.getPublicDetail");
    expect(ui).toContain("api.teachingResources.issueDownloadToken");
    expect(ui).toContain("window.print()");
    expect(ui).toContain("detail.isSubscriber");
    expect(ui).toContain("Viewing is free for everyone");
    expect(ui).toContain("sessionReady");
    expect(ui).toContain("Checking your subscription and loading resource details");
    expect(ui).not.toContain("</p>\\n          {!detail.fullAccess");
  });
  it("does not misrepresent a generic icon as a verified laboratory illustration", () => {
    const ui = read("web/components/gigalearn/TeachingResourcesLibrary.tsx");
    expect(ui).toContain("Illustration not yet available");
    expect(ui).toContain("has not been verified");
    expect(ui).toContain("Zoom illustration");
    expect(ui).toContain("zoomed && resolvedImage");
    expect(ui).not.toContain("⌕ Tap to zoom");
    expect(ui).not.toContain(": <ResourceDiagram title={title} category={category} />");
  });

});
