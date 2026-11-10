/**
 * @vitest-environment edge-runtime
 * Convex-backed GigaSEO workflow tests using an isolated in-memory backend.
 */
/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");
const originalEnv = {
  admin: process.env.PLATFORM_STATS_ADMIN_KEY,
  openai: process.env.OPENAI_API_KEY,
  model: process.env.GIGASEO_OPENAI_MODEL,
};

afterEach(() => {
  if (originalEnv.admin === undefined) delete process.env.PLATFORM_STATS_ADMIN_KEY;
  else process.env.PLATFORM_STATS_ADMIN_KEY = originalEnv.admin;
  if (originalEnv.openai === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalEnv.openai;
  if (originalEnv.model === undefined) delete process.env.GIGASEO_OPENAI_MODEL;
  else process.env.GIGASEO_OPENAI_MODEL = originalEnv.model;
  vi.unstubAllGlobals();
});

describe("GigaSEO Convex workflow", () => {
  it("denies unauthenticated access to admin queries and mutations", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.gigaSeo.getAdminOverview, {})).rejects.toThrow("Unauthorized");
    await expect(
      t.mutation(api.gigaSeo.saveKeywordIdeas, {
        market: "Ghana",
        ideas: [{ keyword: "AI tools for teachers", searchIntent: "informational", rationale: "Relevant" }],
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("researches, deduplicates, drafts, preserves fact-check notes, and gates editorial approval", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "giga-seo-test-admin";
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GIGASEO_OPENAI_MODEL = "gpt-test";
    const t = convexTest(schema, modules);

    const aiResponses = [
      {
        ideas: [
          { keyword: "AI tools for teachers in Ghana", searchIntent: "informational", rationale: "Teacher-focused demand" },
          { keyword: "AI lesson planning Ghana", searchIntent: "informational", rationale: "Practical classroom use" },
        ],
      },
      {
        title: "AI Tools for Teachers in Ghana: A Practical Guide",
        metaDescription: "A practical guide to using AI tools for lesson planning, classroom activities and teacher productivity in Ghana.",
        markdown: [
          "## Getting started",
          "## Practical classroom examples",
          "## **Using Giga3 AI to support teaching and learning**",
          "Giga3 AI brings together GigaLearn curriculum-aligned learning resources and exam practice to help Ghanaian teachers and students explore digital learning. [Explore Giga3 AI](https://www.giga3ai.com/).",
          "## Responsible use and limitations",
          "## Conclusion",
          Array.from({ length: 240 }, (_, index) => `Useful classroom guidance example ${index + 1} for Ghanaian teachers and learners.`).join(" "),
        ].join("\n\n"),
        factCheckNotes: ["Verify any named Ghana Education Service policy before publication."],
      },
    ];
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(aiResponses.shift()) } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));
    vi.stubGlobal("fetch", fetchMock);

    const research = await t.action(api.gigaSeo.researchKeywords, {
      adminKey: "giga-seo-test-admin",
      topic: "AI tools for teachers",
      market: "Ghana",
      audience: "Teachers",
    });
    expect(research.saved).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const savedIdeas = await t.query(api.gigaSeo.listKeywordIdeas, {
      adminKey: "giga-seo-test-admin",
      limit: 10,
    });
    expect(savedIdeas).toHaveLength(2);
    expect(savedIdeas[0].rationale).toBeTruthy();

    // Repeating the same research candidate updates it rather than duplicating it.
    await t.mutation(api.gigaSeo.saveKeywordIdeas, {
      adminKey: "giga-seo-test-admin",
      market: "Ghana",
      ideas: [{ keyword: "AI tools for teachers in Ghana", searchIntent: "informational", rationale: "Updated rationale" }],
    });
    const deduplicated = await t.query(api.gigaSeo.listKeywordIdeas, {
      adminKey: "giga-seo-test-admin",
      limit: 10,
    });
    expect(deduplicated).toHaveLength(2);
    expect(deduplicated.find((idea) => idea.keyword === "AI tools for teachers in Ghana")?.rationale).toBe("Updated rationale");

    const planId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey: "giga-seo-test-admin",
      title: "AI Tools for Teachers in Ghana: A Practical Guide",
      primaryKeyword: "AI tools for teachers in Ghana",
      market: "Ghana",
      audience: "Teachers",
    });
    const repeatedPlanId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey: "giga-seo-test-admin",
      title: "AI Tools for Teachers in Ghana: A Practical Guide",
      primaryKeyword: "AI tools for teachers in Ghana",
      market: "Ghana",
      audience: "Teachers",
    });
    expect(repeatedPlanId).toBe(planId);

    const generated = await t.action(api.gigaSeo.generateDraft, {
      adminKey: "giga-seo-test-admin",
      planId,
    });
    expect(generated.wordCount).toBeGreaterThan(700);
    expect(generated.qualityScore).toBeGreaterThanOrEqual(60);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const queue = await t.query(api.gigaSeo.listContentPlans, {
      adminKey: "giga-seo-test-admin",
      limit: 10,
    });
    expect(queue[0].status).toBe("quality_review");
    expect(queue[0].factCheckNotes).toEqual([
      "Verify any named Ghana Education Service policy before publication.",
    ]);

    await t.mutation(api.gigaSeo.approveDraft, {
      adminKey: "giga-seo-test-admin",
      planId,
    });
    const approved = await t.query(api.gigaSeo.listContentPlans, {
      adminKey: "giga-seo-test-admin",
      limit: 10,
    });
    expect(approved[0].status).toBe("approved");
    expect(approved[0].publishedUrl).toBeUndefined();
  });

  it("keeps imported articles private through approval and publishes them once", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "giga-seo-test-admin";
    const t = convexTest(schema, modules);
    const adminKey = "giga-seo-test-admin";
    const planId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey, title: "Community garden checklist", primaryKeyword: "community gardens", market: "Ghana", audience: "Gardeners",
    });
    const slug = "community-garden-checklist";
    const markdown = "## Planning a shared garden\n\n" + "Agree on a watering schedule with the other gardeners. ".repeat(15);
    await expect(t.mutation(api.gigaSeo.importDraft, { planId, markdown, metaDescription: "A practical checklist for garden volunteers." })).rejects.toThrow("Unauthorized");
    await t.mutation(api.gigaSeo.importDraft, { adminKey, planId, markdown, metaDescription: "A practical checklist for garden volunteers." });
    await expect(t.mutation(api.gigaSeo.publishDraft, { adminKey, planId })).rejects.toThrow("Only an approved article");
    await t.mutation(api.gigaSeo.approveDraft, { adminKey, planId });
    expect(await t.query(api.gigaSeo.getPublishedArticle, { slug })).toBeNull();
    expect(await t.query(api.gigaSeo.listPublishedArticles, {})).toEqual([]);
    const url = await t.mutation(api.gigaSeo.publishDraft, { adminKey, planId });
    expect(await t.mutation(api.gigaSeo.publishDraft, { adminKey, planId })).toBe(url);
    expect(await t.query(api.gigaSeo.getPublishedArticle, { slug })).toMatchObject({ markdown: markdown.trim(), url });
    expect(await t.query(api.gigaSeo.listPublishedArticles, {})).toEqual([
      expect.objectContaining({ url, title: "Community garden checklist" }),
    ]);
    await expect(t.mutation(api.gigaSeo.importDraft, { adminKey, planId, markdown, metaDescription: "A different description for this article." })).rejects.toThrow("Published articles cannot be overwritten");
  });

  it("flags teaching and African-technology topics when the brand is only mentioned incidentally", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "giga-seo-test-admin";
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GIGASEO_OPENAI_MODEL = "gpt-test";
    const t = convexTest(schema, modules);
    const aiResponses = [
      {
        title: "Teaching Digital Skills in African Communities",
        metaDescription: "A practical overview of teaching digital skills in African communities and supporting local learning initiatives.",
        markdown: [
          "## Introduction",
          "Giga3 AI is a digital platform.",
          "## Teaching digital skills",
          "## Community learning",
          "## Conclusion",
          Array.from({ length: 220 }, (_, index) => `Practical digital skills guidance for educators and community learners number ${index + 1}.`).join(" "),
        ].join("\n\n"),
        factCheckNotes: [],
      },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(aiResponses.shift()) } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )));
    const planId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey: "giga-seo-test-admin",
      title: "Teaching Digital Skills in African Communities",
      primaryKeyword: "teaching digital skills African communities",
      market: "Africa",
      audience: "Community educators",
    });
    const generated = await t.action(api.gigaSeo.generateDraft, {
      adminKey: "giga-seo-test-admin",
      planId,
    });
    expect(generated.qualityIssues).not.toContain(
      "Add a substantive Giga3 AI section explaining relevant platform value and a contextual call to action linking to https://www.giga3ai.com/ before editorial approval."
    );
    const savedPlans = await t.query(api.gigaSeo.listContentPlans, {
      adminKey: "giga-seo-test-admin",
      limit: 10,
    });
    expect(savedPlans[0].draftContent).toContain("## How Giga3 AI Relates to teaching digital skills African communities");
    expect(savedPlans[0].draftContent).toContain("[Giga3 AI](https://www.giga3ai.com/)");
  });

  it("rejects approval when required Giga3 AI brand integration is missing", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "giga-seo-test-admin";
    const t = convexTest(schema, modules);
    const planId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey: "giga-seo-test-admin",
      title: "AI Tools for Teachers in Ghana",
      primaryKeyword: "AI tools for teachers",
      market: "Ghana",
      audience: "Teachers",
    });
    await t.mutation(api.gigaSeo.saveDraft, {
      adminKey: "giga-seo-test-admin",
      planId,
      title: "AI Tools for Teachers in Ghana",
      metaDescription: "A sufficiently descriptive meta description for a teacher-focused article about classroom technology and learning in Ghana.",
      draftContent: "A complete article draft with enough content for review.",
      qualityScore: 88,
      qualityIssues: ["Add a relevant Giga3 AI section and contextual call to action before editorial approval."],
      factCheckNotes: [],
    });
    await expect(
      t.mutation(api.gigaSeo.approveDraft, { adminKey: "giga-seo-test-admin", planId })
    ).rejects.toThrow("must include relevant Giga3 AI coverage");
  });

  it("rejects approval for drafts below the quality threshold", async () => {
    process.env.PLATFORM_STATS_ADMIN_KEY = "giga-seo-test-admin";
    const t = convexTest(schema, modules);
    const planId = await t.mutation(api.gigaSeo.createContentPlan, {
      adminKey: "giga-seo-test-admin",
      title: "Low Quality SEO Draft",
      primaryKeyword: "SEO draft",
      market: "Ghana",
      audience: "Teachers",
    });
    await t.mutation(api.gigaSeo.saveDraft, {
      adminKey: "giga-seo-test-admin",
      planId,
      title: "Low Quality SEO Draft",
      metaDescription: "Short",
      draftContent: "Draft content for review.",
      qualityScore: 48,
      qualityIssues: ["Too short"],
      factCheckNotes: [],
    });
    await expect(
      t.mutation(api.gigaSeo.approveDraft, {
        adminKey: "giga-seo-test-admin",
        planId,
      })
    ).rejects.toThrow("needs further editing");
  });
});
