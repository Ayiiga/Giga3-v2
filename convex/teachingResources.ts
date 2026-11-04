import { httpAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { isSubscriptionActive } from "./creditsConfig";

const fileKind = v.union(v.literal("guide"), v.literal("worksheet"), v.literal("image"), v.literal("diagram"));
const accessKind = v.union(v.literal("free"), v.literal("subscriber"));
const statusKind = v.union(v.literal("draft"), v.literal("pending"), v.literal("published"), v.literal("archived"));

function publicResource(row: any) {
  return {
    _id: row._id, slug: row.slug, title: row.title, summary: row.summary,
    subject: row.subject, levelBand: row.levelBand, classes: row.classes,
    topic: row.topic, category: row.category, activity: row.activity,
    access: row.access, previewText: row.previewText ?? null,
    videoUrl: row.videoUrl ?? null,
  };
}

export const listPublished = query({
  args: {
    search: v.optional(v.string()), subject: v.optional(v.string()),
    levelBand: v.optional(v.union(v.literal("jhs"), v.literal("shs"))),
    className: v.optional(v.string()), category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query("teachingResources")
      .withIndex("by_status_updated", q => q.eq("status", "published"))
      .order("desc").take(300);
    if (args.subject) rows = rows.filter(r => r.subject === args.subject);
    if (args.levelBand) rows = rows.filter(r => r.levelBand === args.levelBand);
    if (args.className) rows = rows.filter(r => r.classes.includes(args.className!));
    if (args.category) rows = rows.filter(r => r.category === args.category);
    const q = args.search?.trim().toLowerCase();
    if (q) rows = rows.filter(r =>
      [r.title, r.summary, r.subject, r.topic, r.category, r.activity].join(" ").toLowerCase().includes(q)
    );
    return rows.map(publicResource);
  },
});

export const getPublicDetail = query({
  args: { slug: v.string(), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("teachingResources")
      .withIndex("by_slug", q => q.eq("slug", args.slug)).first();
    if (!row || row.status !== "published") return null;
    let active = false;
    if (args.sessionToken) {
      try {
        const email = await requireSession(args.sessionToken, ctx);
        const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
        active = Boolean(user && isSubscriptionActive((user.subscriptionPlan ?? "free") as any, user.subscriptionExpiresAt));
      } catch { active = false; }
    }
    const fullAccess = active;
    const components = JSON.parse(row.componentsJson);
    const instructions = JSON.parse(row.instructionsJson);
    const activities = JSON.parse(row.activitiesJson);
    const safety = JSON.parse(row.safetyJson);
    const mistakes = JSON.parse(row.mistakesJson);
    return {
      ...publicResource(row),
      description: fullAccess ? row.description : (row.previewText ?? row.summary),
      components: fullAccess ? components : components.slice(0, 2),
      instructions: fullAccess ? instructions : instructions.slice(0, 1),
      activities: fullAccess ? activities : activities.slice(0, 1),
      safety: fullAccess ? safety : safety.slice(0, 1),
      commonMistakes: fullAccess ? mistakes : [],
      teacherGuidance: fullAccess ? row.teacherGuidance ?? "" : "",
      studentExercises: fullAccess ? row.studentExercises ?? "" : "",
      curriculumReference: row.curriculumReference ?? "",
      hasImage: Boolean(row.imageStorageId), hasDiagram: Boolean(row.diagramStorageId),
      hasGuide: Boolean(row.guideStorageId), hasWorksheet: Boolean(row.worksheetStorageId),
      fullAccess,
    };
  },
});

export const listAdminResources = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const rows = await ctx.db.query("teachingResources").order("desc").take(300);
    return rows.map(row => ({
      _id: row._id, slug: row.slug, title: row.title, subject: row.subject,
      status: row.status, access: row.access, hasGuide: Boolean(row.guideStorageId),
      hasWorksheet: Boolean(row.worksheetStorageId), hasImage: Boolean(row.imageStorageId),
      hasDiagram: Boolean(row.diagramStorageId),
    }));
  },
});

export const createResource = mutation({
  args: {
    sessionToken: v.string(), slug: v.string(), title: v.string(), summary: v.string(),
    description: v.string(), subject: v.string(), levelBand: v.union(v.literal("jhs"), v.literal("shs")),
    classes: v.array(v.string()), topic: v.string(), category: v.string(), activity: v.string(),
    componentsJson: v.string(), instructionsJson: v.string(), activitiesJson: v.string(),
    safetyJson: v.string(), mistakesJson: v.string(), teacherGuidance: v.optional(v.string()),
    studentExercises: v.optional(v.string()), curriculumReference: v.optional(v.string()),
    previewText: v.optional(v.string()), videoUrl: v.optional(v.string()), access: accessKind,
    status: statusKind,
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Only platform administrators can create official resources.");
    const slug = args.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug || slug.length > 100) throw new Error("Enter a valid resource slug.");
    const existing = await ctx.db.query("teachingResources").withIndex("by_slug", q => q.eq("slug", slug)).first();
    if (existing) throw new Error("A resource with this slug already exists.");
    const now = Date.now();
    const { sessionToken: _token, ...data } = args;
    return await ctx.db.insert("teachingResources", {
      ...data, slug, createdBy: email, createdAt: now, updatedAt: now,
    });
  },
});

export const updateResourceStatus = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), status: statusKind },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    await ctx.db.patch(args.resourceId, {
      status: args.status,
      ...(args.status === "published" ? { reviewedBy: email, reviewedAt: Date.now() } : {}),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const createUploadUrl = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachResourceFile = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), fileKind, storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.fileKind === "guide") patch.guideStorageId = args.storageId;
    if (args.fileKind === "worksheet") patch.worksheetStorageId = args.storageId;
    if (args.fileKind === "image") patch.imageStorageId = args.storageId;
    if (args.fileKind === "diagram") patch.diagramStorageId = args.storageId;
    await ctx.db.patch(args.resourceId, patch);
    return { ok: true };
  },
});

export const issueDownloadToken = mutation({
  args: { sessionToken: v.string(), resourceId: v.id("teachingResources"), fileKind },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const resource = await ctx.db.get(args.resourceId);
    if (!resource || resource.status !== "published") throw new Error("Resource is unavailable.");
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
    const active = Boolean(user && isSubscriptionActive((user.subscriptionPlan ?? "free") as any, user.subscriptionExpiresAt));
    const freePreview = resource.access === "free" && (args.fileKind === "image" || args.fileKind === "diagram");
    if (!freePreview && !active) throw new Error("An active subscription is required to access this resource file.");
    const storageId = args.fileKind === "guide" ? resource.guideStorageId
      : args.fileKind === "worksheet" ? resource.worksheetStorageId
      : args.fileKind === "image" ? resource.imageStorageId : resource.diagramStorageId;
    if (!storageId) throw new Error("This resource file has not been uploaded yet.");
    const token = crypto.randomUUID().replace(/-/g, "");
    const now = Date.now();
    await ctx.db.insert("teachingResourceDownloadTokens", {
      token, resourceId: args.resourceId, userEmail: email, fileKind: args.fileKind,
      expiresAt: now + 90_000, createdAt: now,
    });
    return { token, expiresInSeconds: 90 };
  },
});

export const consumeDownloadToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("teachingResourceDownloadTokens")
      .withIndex("by_token", q => q.eq("token", args.token)).first();
    if (!row || row.consumedAt || row.expiresAt <= Date.now()) return null;
    const resource = await ctx.db.get(row.resourceId);
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", row.userEmail)).first();
    if (!resource || resource.status !== "published" || !user) return null;
    const active = isSubscriptionActive((user.subscriptionPlan ?? "free") as any, user.subscriptionExpiresAt);
    if (!(resource.access === "free" && (row.fileKind === "image" || row.fileKind === "diagram")) && !active) return null;
    const storageId = row.fileKind === "guide" ? resource.guideStorageId
      : row.fileKind === "worksheet" ? resource.worksheetStorageId
      : row.fileKind === "image" ? resource.imageStorageId : resource.diagramStorageId;
    if (!storageId) return null;
    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    return { storageId, title: resource.title, fileKind: row.fileKind };
  },
});

export const teachingResourceDownload = httpAction(async (ctx, request) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response("Invalid or expired download link.", { status: 403 });
  const access = await ctx.runMutation(internal.teachingResources.consumeDownloadToken, { token });
  if (!access) return new Response("This download link has expired or access is no longer active.", { status: 403 });
  const blob = await ctx.storage.get(access.storageId);
  if (!blob) return new Response("Resource file not found.", { status: 404 });
  const ext = access.fileKind === "image" ? "jpg" : access.fileKind === "diagram" ? "png" : "pdf";
  const filename = `${access.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 70)}-${access.fileKind}.${ext}`;
  return new Response(blob, {
    headers: {
      "Content-Type": access.fileKind === "image" ? "image/jpeg" : access.fileKind === "diagram" ? "image/png" : "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
