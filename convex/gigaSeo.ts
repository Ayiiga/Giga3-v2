import { action, mutation, query } from "./_generated/server";
import { makeFunctionReference } from "convex/server";

// Keep this module's backend type-check independent of the repository-wide generated API map.
const saveKeywordIdeasRef = makeFunctionReference<"mutation">("gigaSeo:saveKeywordIdeas");
const getPlanForDraftRef = makeFunctionReference<"query">("gigaSeo:getPlanForDraft");
const saveDraftRef = makeFunctionReference<"mutation">("gigaSeo:saveDraft");
import { v } from "convex/values";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { GIGA3_VERIFIED_FEATURE_EDITORIAL_RULE } from "./gigaSeoEditorialPolicy";

const DEFAULT_SETTINGS = {
  key: "primary",
  enabled: false,
  articlesPerWeek: 3,
  publishingPermission: "human_approval" as const,
  targetMarket: "ghana_international" as const,
  contentPriorities: [
    "AI tools and tutorials",
    "Ghana education and examination preparation",
    "STEM, robotics and digital skills",
    "Teacher development and professional learning",
    "African technology and innovation",
  ],
};

const keywordIdeaValidator = v.object({
  keyword: v.string(),
  searchIntent: v.string(),
  rationale: v.string(),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

async function requestOpenAi(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("GigaSEO AI is not configured: OPENAI_API_KEY is missing in Convex.");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GIGASEO_OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GigaSEO AI provider error (${response.status}): ${detail.slice(0, 300)}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI provider returned an empty response.");
  return content;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("The AI response was not valid JSON. Please retry.");
  }
}

export const getAdminOverview = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const settings = await ctx.db.query("gigaSeoSettings").withIndex("by_key", (q) => q.eq("key", "primary")).unique();
    // Keep the admin overview bounded; the dashboard only needs a useful count
    // and these collections are expected to remain comfortably below this cap.
    const [keywordRows, contentPlanRows] = await Promise.all([
      ctx.db.query("gigaSeoKeywordIdeas").take(10_000),
      ctx.db.query("gigaSeoContentPlans").take(10_000),
    ]);
    const keywordCount = keywordRows.length;
    const contentPlanCount = contentPlanRows.length;
    return { settings: settings ?? DEFAULT_SETTINGS, keywordCount, contentPlanCount };
  },
});

export const listKeywordIdeas = query({
  args: { ...adminCredentialArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));
    return await ctx.db.query("gigaSeoKeywordIdeas").withIndex("by_status_created")
      .order("desc").take(limit);
  },
});

export const listContentPlans = query({
  args: { ...adminCredentialArgs, limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 20)));
    return await ctx.db.query("gigaSeoContentPlans").withIndex("by_updated")
      .order("desc").take(limit);
  },
});

export const updateSettings = mutation({
  args: {
    ...adminCredentialArgs,
    enabled: v.boolean(),
    articlesPerWeek: v.number(),
    publishingPermission: v.union(v.literal("human_approval"), v.literal("automatic_after_quality_checks")),
    targetMarket: v.union(v.literal("ghana_only"), v.literal("ghana_international"), v.literal("africa_international")),
    contentPriorities: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!Number.isInteger(args.articlesPerWeek) || args.articlesPerWeek < 1 || args.articlesPerWeek > 7) {
      throw new Error("Publishing frequency must be between 1 and 7 articles per week.");
    }
    if (args.contentPriorities.length < 1 || args.contentPriorities.length > 10) {
      throw new Error("Choose between 1 and 10 content priorities.");
    }
    const now = Date.now();
    const existing = await ctx.db.query("gigaSeoSettings").withIndex("by_key", (q) => q.eq("key", "primary")).unique();
    const value = { ...DEFAULT_SETTINGS, enabled: args.enabled, articlesPerWeek: args.articlesPerWeek,
      publishingPermission: args.publishingPermission, targetMarket: args.targetMarket,
      contentPriorities: args.contentPriorities, updatedBy: "platform_admin", updatedAt: now };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("gigaSeoSettings", value);
    return { ok: true as const, updatedAt: now };
  },
});

/** AI-generated keyword candidates. Search volume/difficulty are intentionally not fabricated. */
export const researchKeywords = action({
  args: { ...adminCredentialArgs, topic: v.string(), market: v.string(), audience: v.string() },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const topic = args.topic.trim().slice(0, 180);
    if (topic.length < 3) throw new Error("Enter a topic of at least 3 characters.");
    const raw = await requestOpenAi(
      "You are an SEO strategist. Return JSON only: {ideas:[{keyword,searchIntent,rationale}]}. Give 8 distinct natural-language keyword candidates. Do not invent search volume, keyword difficulty, rankings, or search trends. Use realistic Ghana/African context where appropriate.",
      `Topic: ${topic}\nTarget market: ${args.market}\nAudience: ${args.audience}\nAvoid duplicates and keyword stuffing.`
    );
    const parsed = parseJsonObject(raw);
    if (!Array.isArray(parsed.ideas)) throw new Error("The AI response did not contain keyword ideas.");
    const ideas = parsed.ideas.slice(0, 12).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        keyword: String(row.keyword ?? "").trim().slice(0, 160),
        searchIntent: String(row.searchIntent ?? "informational").trim().slice(0, 80),
        rationale: String(row.rationale ?? "").trim().slice(0, 500),
      };
    }).filter((item) => item.keyword.length >= 3);
    if (!ideas.length) throw new Error("No usable keyword ideas were generated. Please retry.");
    await ctx.runMutation(saveKeywordIdeasRef, { adminSessionToken: args.adminSessionToken, adminKey: args.adminKey, ideas, market: args.market });
    return { saved: ideas.length, ideas };
  },
});

export const saveKeywordIdeas = mutation({
  args: { ...adminCredentialArgs, market: v.string(), ideas: v.array(keywordIdeaValidator) },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const now = Date.now();
    let saved = 0;
    for (const idea of args.ideas.slice(0, 12)) {
      const keyword = idea.keyword.trim().slice(0, 160);
      if (!keyword) continue;
      const existing = await ctx.db.query("gigaSeoKeywordIdeas")
        .withIndex("by_keyword_market", (q) => q.eq("keyword", keyword).eq("market", args.market)).unique();
      if (existing) {
        await ctx.db.patch(existing._id, { searchIntent: idea.searchIntent, rationale: idea.rationale, source: "ai_suggestion", updatedAt: now });
      } else {
        await ctx.db.insert("gigaSeoKeywordIdeas", { keyword, market: args.market,
          searchIntent: idea.searchIntent, rationale: idea.rationale, source: "ai_suggestion", status: "new", createdAt: now, updatedAt: now });
      }
      saved++;
    }
    return { saved };
  },
});

export const createContentPlan = mutation({
  args: { ...adminCredentialArgs, title: v.string(), primaryKeyword: v.string(), market: v.string(), audience: v.string() },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const title = args.title.trim().slice(0, 180);
    const primaryKeyword = args.primaryKeyword.trim().slice(0, 160);
    if (title.length < 5 || primaryKeyword.length < 3) throw new Error("A valid title and primary keyword are required.");
    const slug = slugify(title);
    const existing = await ctx.db.query("gigaSeoContentPlans").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
    // Repeated taps/retries reuse the existing plan instead of surfacing an error.
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert("gigaSeoContentPlans", { title, slug, primaryKeyword,
      market: args.market.slice(0, 80), audience: args.audience.slice(0, 160),
      status: "idea", createdAt: now, updatedAt: now });
  },
});

export const generateDraft = action({
  args: { ...adminCredentialArgs, planId: v.id("gigaSeoContentPlans") },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const plan = await ctx.runQuery(getPlanForDraftRef, { ...args, planId: args.planId });
    if (!plan) throw new Error("Content plan not found.");
    const raw = await requestOpenAi(
      "You are the lead editorial writer for the Giga3 AI blog, a Ghana-focused technology, education and learning platform. Return JSON only with title, metaDescription, markdown, and factCheckNotes (array). Write an original, useful, well-structured article with H2/H3 headings, practical Ghana-relevant examples, a concise conclusion and FAQ where appropriate. BRAND INTEGRATION IS REQUIRED whenever the topic relates to AI tools, teaching, education, students, learning, examination preparation, STEM or African technology: include a natural, substantive section explaining how Giga3 AI can help the reader, describing only capabilities verified as currently available in the live product. Never infer features from roadmap items or marketing assumptions; omit uncertain claims and flag them in factCheckNotes. Include a clear, helpful call to action to explore Giga3 AI at https://www.giga3ai.com/; do not turn the article into an advertisement or repeat the brand unnaturally. For unrelated topics, mention Giga3 AI only when genuinely useful. Do not invent product capabilities, prices, availability, outcomes, statistics, quotes, dates, named sources, or citations. Mark claims requiring verification in factCheckNotes. Do not claim live keyword metrics. " + GIGA3_VERIFIED_FEATURE_EDITORIAL_RULE,
      `Working title: ${plan.title}\nPrimary keyword: ${plan.primaryKeyword}\nMarket: ${plan.market}\nAudience: ${plan.audience}\nWrite approximately 900-1200 words. Naturally use the keyword; prioritize reader value.`
    );
    const parsed = parseJsonObject(raw);
    const title = String(parsed.title ?? plan.title).trim().slice(0, 180);
    const metaDescription = String(parsed.metaDescription ?? "").trim().slice(0, 300);
    let markdown = String(parsed.markdown ?? "").trim().slice(0, 40000);
    const notes = Array.isArray(parsed.factCheckNotes) ? parsed.factCheckNotes.map(String).slice(0, 20) : [];
    if (markdown.length < 500) throw new Error("The generated article is too short or incomplete. Please retry.");
    const headings = (markdown.match(/^##\s+/gm) ?? []).length;
    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const topicRequiresBrandIntegration = /\b(ai|artificial intelligence|teach(?:er|ing)?|educat(?:ion|or|ional)|student|learn(?:ing)?|exam(?:ination)?|bece|wassce|stem|classroom|school|african technology|technology|digital skills|innovation|local communities)\b/i.test(`${plan.title} ${plan.primaryKeyword}`);
    // Normalize Markdown decoration before checking headings so bold/linked H2s are recognised.
    const sections = markdown.split(/^##\s+/m).slice(1);
    const giga3Section = sections.find((section) => {
      const heading = section.split("\n", 1)[0].replace(/[*_\[\]]/g, "").trim();
      return /giga3\s*ai/i.test(heading);
    });
    const giga3SectionBody = giga3Section?.split("\n").slice(1).join(" ").replace(/\s+/g, " ").trim() ?? "";
    let hasSubstantiveGiga3Section = Boolean(giga3Section && giga3SectionBody.length >= 80);
    // Accept Markdown CTA links regardless of whether the URL is on the same line as its anchor.
    let hasGiga3CallToAction =
      /\[(?:explore|visit|discover|try|learn more about)[^\]]*\]\(https?:\/\/(?:www\.)?giga3ai\.com\/?[^)]*\)/i.test(markdown) ||
      /\b(?:explore|visit|discover|try|learn more about)\b[^\n]{0,180}https?:\/\/(?:www\.)?giga3ai\.com\/?/i.test(markdown);
    // Add a factual fallback when the model omits required brand integration.
    if (topicRequiresBrandIntegration && !hasSubstantiveGiga3Section) {
      const contextualTopic = plan.primaryKeyword.replace(/[<>]/g, " ").replace(/[\r\n]/g, " ").trim().slice(0, 120);
      markdown += "\n\n## How Giga3 AI Relates to " + contextualTopic +
        "\n\nGiga3 AI is the AI service within Giga3 Hub, an Africa-built digital platform. For readers exploring " +
        contextualTopic + ", the platform provides a place to discover its current AI and learning resources and assess which tools are relevant to their needs. Always check the live platform for current features and availability; do not assume that planned or unreleased capabilities are available.\n";
      hasSubstantiveGiga3Section = true;
    }
    if (topicRequiresBrandIntegration && !hasGiga3CallToAction) {
      markdown += "\n\nTo explore the platform and its currently available resources, visit [Giga3 AI](https://www.giga3ai.com/).\n";
      hasGiga3CallToAction = true;
    }
    const missingBrandIntegration = topicRequiresBrandIntegration && !(hasSubstantiveGiga3Section && hasGiga3CallToAction);
    const brandIntegrationIssue = "Add a substantive Giga3 AI section explaining relevant platform value and a contextual call to action linking to https://www.giga3ai.com/ before editorial approval.";
    const issues = [
      ...(wordCount < 700 ? ["Article is shorter than the recommended 700 words."] : []),
      ...(headings < 3 ? ["Add at least three descriptive H2 sections."] : []),
      ...(metaDescription.length < 100 || metaDescription.length > 170 ? ["Review meta description length (recommended 100–170 characters)."] : []),
      ...(missingBrandIntegration ? [brandIntegrationIssue] : []),
      ...(notes.length ? [`${notes.length} factual claim(s) require editorial verification.`] : []),
    ];
    const qualityScore = Math.max(0, Math.min(100, 100 - issues.length * 12));
    await ctx.runMutation(saveDraftRef, { ...args, planId: args.planId, title, metaDescription, draftContent: markdown, qualityScore, qualityIssues: issues, factCheckNotes: notes });
    return { wordCount, qualityScore, qualityIssues: issues, factCheckNotes: notes };
  },
});

export const getPlanForDraft = query({
  args: { ...adminCredentialArgs, planId: v.id("gigaSeoContentPlans") },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    return await ctx.db.get(args.planId);
  },
});

export const saveDraft = mutation({
  args: { ...adminCredentialArgs, planId: v.id("gigaSeoContentPlans"), title: v.string(),
    metaDescription: v.string(), draftContent: v.string(), qualityScore: v.number(), qualityIssues: v.array(v.string()), factCheckNotes: v.array(v.string()) },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Content plan not found.");
    await ctx.db.patch(args.planId, { title: args.title, metaDescription: args.metaDescription,
      draftContent: args.draftContent, qualityScore: args.qualityScore,
      qualityIssues: args.qualityIssues, factCheckNotes: args.factCheckNotes.slice(0, 20), status: "quality_review", updatedAt: Date.now() });
    return { ok: true };
  },
});


/** Human approval changes workflow state only; it does not publish the article. */
export const approveDraft = mutation({
  args: { ...adminCredentialArgs, planId: v.id("gigaSeoContentPlans") },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.status !== "quality_review" || !plan.draftContent) {
      throw new Error("Only a generated draft in quality review can be approved.");
    }
    if ((plan.qualityScore ?? 0) < 60) {
      throw new Error("This draft needs further editing before it can be approved.");
    }
    if ((plan.qualityIssues ?? []).some((issue) => issue.includes("Giga3 AI section"))) {
      throw new Error("This article must include relevant Giga3 AI coverage before it can be approved.");
    }
    await ctx.db.patch(args.planId, { status: "approved", updatedAt: Date.now() });
    return { ok: true as const };
  },
});
