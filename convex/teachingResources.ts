import { httpAction, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { isPlatformAdminEmail } from "./platformAdmin";
import { isSubscriptionActive } from "./creditsConfig";

const fileKind = v.union(v.literal("guide"), v.literal("worksheet"), v.literal("image"), v.literal("diagram"));
const accessKind = v.union(v.literal("free"), v.literal("subscriber"));
const statusKind = v.union(v.literal("draft"), v.literal("pending"), v.literal("published"), v.literal("archived"));

function parseStringArray(value: string, field: string): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${field} must be valid JSON.`); }
  if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) {
    throw new Error(`${field} must be a JSON array of text values.`);
  }
  return parsed;
}


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
      .order("desc").collect();
    if (args.subject) rows = rows.filter(r => r.subject === args.subject);
    if (args.levelBand) rows = rows.filter(r => r.levelBand === args.levelBand);
    if (args.className) rows = rows.filter(r => r.classes.includes(args.className!));
    if (args.category) rows = rows.filter(r => r.category === args.category);
    const q = args.search?.trim().toLowerCase();
    if (q) rows = rows.filter(r =>
      [r.title, r.summary, r.subject, r.topic, r.category, r.activity].join(" ").toLowerCase().includes(q)
    );
    return rows.slice(0, 300).map(publicResource);
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
    const fullAccess = active || row.access === "free";
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

export const seedStarterResources = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const starters = [
      { slug: "microscope", title: "Compound Light Microscope", subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 2", "JHS 3"], topic: "Cells and microscopy", category: "Laboratory Equipment", activity: "Observe onion epidermal cells", summary: "Learn the parts, functions and safe operation of a compound light microscope.", description: "A compound light microscope uses visible light and multiple lenses to magnify small specimens so that cells and other structures can be observed.", components: ["Eyepiece: lens viewed by the eye", "Objective lenses: provide different magnifications", "Stage and clips: hold the slide", "Diaphragm: controls light", "Coarse and fine focus knobs: sharpen the image"], instructions: ["Carry the microscope with two hands, supporting the arm and base.", "Place it on a stable, dry bench and select the low-power objective.", "Place a prepared slide on the stage and secure it with clips.", "Adjust the light and look through the eyepiece while using coarse focus carefully.", "Use fine focus to sharpen the image; centre the specimen before changing magnification.", "After use, return to low power, remove the slide and cover the microscope."], activities: ["Observe a prepared onion-cell slide and draw what is visible.", "Compare the field of view at low and high power."], safety: ["Carry with two hands.", "Never allow the objective lens to touch the slide.", "Keep liquids away from electrical parts.", "Clean lenses only with lens paper."], mistakes: ["Starting on high power", "Using coarse focus on high power", "Touching lenses with fingers"] },
      { slug: "measuring-beaker", title: "Laboratory Beaker", subject: "Chemistry", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2"], topic: "Laboratory apparatus and measurement", category: "Laboratory Equipment", activity: "Measure and mix a liquid sample", summary: "Identify a beaker and use it safely for holding, mixing and approximate volume measurement.", description: "A beaker is a wide-mouthed laboratory vessel used mainly for holding, mixing and heating liquids. Its graduations give approximate rather than highly accurate volumes.", components: ["Rim and spout: pouring", "Graduation marks: approximate volume", "Flat base: stable support", "Heat-resistant glass: suitable for controlled heating when specified"], instructions: ["Check the beaker for cracks or chips.", "Place it on a stable, suitable surface.", "Pour the liquid slowly and read the approximate graduation at eye level.", "Use a measuring cylinder when an accurate volume is required.", "Use suitable tongs or heat protection for hot glassware and allow it to cool before washing."], activities: ["Compare a beaker reading with a measuring-cylinder reading.", "Mix two safe water-based solutions as directed by the teacher."], safety: ["Do not use cracked glassware.", "Never heat a sealed container.", "Use eye protection and teacher-approved heating equipment.", "Treat hot glass as hot even when it looks cool."], mistakes: ["Treating beaker graduations as precise", "Heating damaged glassware", "Pouring too close to the rim"] },
      { slug: "laboratory-thermometer", title: "Laboratory Thermometer", subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 1", "JHS 2"], topic: "Temperature and heat", category: "Laboratory Equipment", activity: "Measure the temperature of water", summary: "Read temperature correctly and use a laboratory thermometer without damaging it.", description: "A laboratory thermometer measures the temperature of substances during an experiment. The scale and range depend on the instrument.", components: ["Bulb or sensing tip: detects temperature", "Stem: supports the scale", "Graduated scale: displays temperature", "Liquid column or digital display: indicates the reading"], instructions: ["Check the thermometer range and condition.", "Place the sensing bulb in the liquid without touching the container sides or base.", "Wait for the reading to stabilise.", "Read at eye level while the bulb remains immersed.", "Remove carefully, clean as instructed and store safely."], activities: ["Measure room-temperature water and warm water using teacher-approved methods.", "Record readings in a results table and compare them."], safety: ["Do not use a damaged glass thermometer.", "Do not exceed the stated temperature range.", "Avoid direct flame unless the instrument is designed for it.", "Report spills or breakage immediately."], mistakes: ["Allowing the bulb to touch the beaker", "Reading from above or below eye level", "Recording before the reading stabilises"] },
      { slug: "digital-multimeter", title: "Digital Multimeter", subject: "Physics", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2", "SHS 3"], topic: "Electricity and electrical measurement", category: "Practical Materials", activity: "Measure a low-voltage cell", summary: "Understand multimeter controls and safely measure voltage in a low-voltage classroom circuit.", description: "A digital multimeter measures electrical quantities such as voltage, current and resistance. Learners should use only teacher-approved low-voltage circuits.", components: ["Display: shows measured value", "Rotary selector: chooses measurement type and range", "COM socket: common test lead", "V/Ω socket: voltage and resistance lead", "Current socket: current measurement lead"], instructions: ["Inspect the meter and leads for damage.", "Ask the teacher to confirm the correct mode, range and sockets.", "For voltage, connect the meter in parallel with the low-voltage component.", "Observe polarity for DC measurements and record the display.", "Disconnect the leads and return the selector to OFF."], activities: ["Measure the voltage of a teacher-approved low-voltage cell.", "Compare the voltage across two cells connected in series under supervision."], safety: ["Never measure mains electricity as a student activity.", "Never connect a meter set to current mode directly across a battery.", "Use only approved low-voltage supplies.", "Do not use damaged leads or equipment."], mistakes: ["Wrong socket or selector setting", "Connecting a voltmeter in series", "Attempting mains measurements"] },
    ];
    let created = 0;
    for (const item of starters) {
      const existing = await ctx.db.query("teachingResources").withIndex("by_slug", q => q.eq("slug", item.slug)).first();
      if (existing) continue;
      const { components, instructions, activities, safety, mistakes, ...base } = item;
      const now = Date.now();
      await ctx.db.insert("teachingResources", {
        ...base, componentsJson: JSON.stringify(components), instructionsJson: JSON.stringify(instructions),
        activitiesJson: JSON.stringify(activities), safetyJson: JSON.stringify(safety), mistakesJson: JSON.stringify(mistakes),
        teacherGuidance: "Demonstrate the equipment first, check learners understand its purpose, then supervise small-group practice. Align the activity to the school's approved scheme of learning.",
        studentExercises: "Draw and label the equipment. State its purpose, describe the safe operating steps and record observations in a results table.",
        previewText: item.summary, access: "subscriber", status: "published",
        createdBy: email, reviewedBy: email, reviewedAt: now, createdAt: now, updatedAt: now,
      });
      created++;
    }
    return { created, message: created ? `Published ${created} starter practical guides.` : "Starter resources are already available." };
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
    parseStringArray(args.componentsJson, "Components");
    parseStringArray(args.instructionsJson, "Instructions");
    parseStringArray(args.activitiesJson, "Activities");
    parseStringArray(args.safetyJson, "Safety precautions");
    parseStringArray(args.mistakesJson, "Common mistakes");
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
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) throw new Error("Uploaded file was not found.");
    const allowed = args.fileKind === "guide" || args.fileKind === "worksheet"
      ? ["application/pdf"]
      : args.fileKind === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["image/png", "image/jpeg"];
    if (!allowed.includes(metadata.contentType)) throw new Error("Unsupported file type for this resource attachment.");
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.fileKind === "guide") { patch.guideStorageId = args.storageId; patch.guideContentType = metadata.contentType; }
    if (args.fileKind === "worksheet") { patch.worksheetStorageId = args.storageId; patch.worksheetContentType = metadata.contentType; }
    if (args.fileKind === "image") { patch.imageStorageId = args.storageId; patch.imageContentType = metadata.contentType; }
    if (args.fileKind === "diagram") { patch.diagramStorageId = args.storageId; patch.diagramContentType = metadata.contentType; }
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
    const freeAccess = resource.access === "free";
    if (!freeAccess && !active) throw new Error("An active subscription is required to access this resource file.");
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
    if (resource.access !== "free" && !active) return null;
    const storageId = row.fileKind === "guide" ? resource.guideStorageId
      : row.fileKind === "worksheet" ? resource.worksheetStorageId
      : row.fileKind === "image" ? resource.imageStorageId : resource.diagramStorageId;
    if (!storageId) return null;
    await ctx.db.patch(row._id, { consumedAt: Date.now() });
    const contentType = row.fileKind === "guide" ? resource.guideContentType
      : row.fileKind === "worksheet" ? resource.worksheetContentType
      : row.fileKind === "image" ? resource.imageContentType : resource.diagramContentType;
    return { storageId, title: resource.title, fileKind: row.fileKind, contentType: contentType ?? "application/octet-stream" };
  },
});

export const teachingResourceDownload = httpAction(async (ctx, request) => {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32}$/.test(token)) return new Response("Invalid or expired download link.", { status: 403 });
  const access = await ctx.runMutation(internal.teachingResources.consumeDownloadToken, { token });
  if (!access) return new Response("This download link has expired or access is no longer active.", { status: 403 });
  const blob = await ctx.storage.get(access.storageId);
  if (!blob) return new Response("Resource file not found.", { status: 404 });
  const ext = access.contentType === "image/png" ? "png" : access.contentType === "image/webp" ? "webp" : access.contentType === "image/jpeg" ? "jpg" : "pdf";
  const filename = `${access.title.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 70)}-${access.fileKind}.${ext}`;
  return new Response(blob, {
    headers: {
      "Content-Type": access.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
