import { httpAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
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
    let activeSubscriber = false;
    if (args.sessionToken) {
      try {
        const email = await requireSession(args.sessionToken, ctx);
        const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
        activeSubscriber = Boolean(user && isSubscriptionActive((user.subscriptionPlan ?? "free") as any, user.subscriptionExpiresAt));
      } catch { activeSubscriber = false; }
    }
    const fullAccess = row.access === "free" || activeSubscriber;
    return {
      ...publicResource(row), description: row.description,
      components: fullAccess ? JSON.parse(row.componentsJson) : [],
      instructions: fullAccess ? JSON.parse(row.instructionsJson) : [],
      activities: fullAccess ? JSON.parse(row.activitiesJson) : [],
      safety: fullAccess ? JSON.parse(row.safetyJson) : [],
      commonMistakes: fullAccess ? JSON.parse(row.mistakesJson) : [],
      teacherGuidance: fullAccess ? row.teacherGuidance ?? "" : "",
      studentExercises: fullAccess ? row.studentExercises ?? "" : "",
      curriculumReference: row.curriculumReference ?? "",
      hasImage: Boolean(row.imageStorageId), hasDiagram: Boolean(row.diagramStorageId),
      hasGuide: Boolean(row.guideStorageId), hasWorksheet: Boolean(row.worksheetStorageId),
      fullAccess,
    };
  },
});

export const seedStarterResources = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    if (!isPlatformAdminEmail(email)) throw new Error("Administrator access required.");
    const existing = await ctx.db.query("teachingResources").take(1);
    if (existing.length) return { created: 0, message: "Starter resources already exist." };
    const starter = [
      {
        slug: "compound-microscope", title: "Compound Microscope", summary: "Observe cells and other tiny structures using magnification.", description: "A compound microscope is an optical instrument used in school science laboratories to magnify very small specimens that cannot be seen clearly with the naked eye.",
        subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 2", "JHS 3"], topic: "Cells and microscopes", category: "Laboratory Equipment", activity: "Prepare and observe a temporary onion-cell slide.",
        componentsJson: JSON.stringify(["Eyepiece: lens viewed through by the observer","Objective lenses: provide different magnifications","Stage: supports the slide","Stage clips: hold the slide in position","Diaphragm: controls the amount of light","Mirror or illuminator: directs light through the specimen","Coarse and fine adjustment knobs: bring the image into focus","Arm and base: support the instrument"]),
        instructionsJson: JSON.stringify(["Carry the microscope with two hands, one holding the arm and the other supporting the base.","Place it on a stable, clean bench and select the lowest-power objective lens.","Place the prepared slide on the stage and secure it with the clips.","Adjust the light source or mirror so light passes through the specimen.","Look through the eyepiece and use the coarse adjustment slowly to locate the image.","Use the fine adjustment to sharpen the image. Centre the specimen before changing to a higher power.","After observation, return to the lowest-power objective, remove the slide and clean the instrument with lens paper."]),
        activitiesJson: JSON.stringify(["Observe a prepared onion epidermis slide and draw the visible cells.","Compare the appearance of the same specimen under low and high power.","Record the objective lens used and describe how the image changes."]),
        safetyJson: JSON.stringify(["Carry with two hands and keep away from the edge of the bench.","Do not touch lenses with fingers or ordinary cloth.","Use prepared slides carefully; report broken glass immediately.","Never force the adjustment knobs or objective turret."]),
        mistakesJson: JSON.stringify(["Starting with the highest-power objective","Using coarse focus at high magnification","Allowing the objective lens to hit the slide","Using tissue or fingers to clean lenses"]),
        teacherGuidance: "Demonstrate safe carrying, focusing and slide handling before group work. Where microscopes are limited, organise small rotating groups and use a projected demonstration if available.",
        studentExercises: "1. Name four parts of a microscope and state their functions. 2. Explain why focusing begins with the low-power objective. 3. Draw and label a compound microscope.",
        curriculumReference: "Ghana NaCCA JHS Science: cells, observation and use of scientific equipment.", previewText: "Learn the parts of a compound microscope, safe focusing and a simple onion-cell observation."
      },
      {
        slug: "laboratory-beaker", title: "Laboratory Beaker", summary: "Hold, mix and heat liquids during practical science activities.", description: "A beaker is a wide-mouthed laboratory container with a flat bottom and a pouring lip. Graduations provide approximate volume estimates; they are not intended for highly accurate measurement.",
        subject: "Chemistry", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2"], topic: "Laboratory apparatus and measurement", category: "Laboratory Equipment", activity: "Measure, mix and transfer a safe volume of water.",
        componentsJson: JSON.stringify(["Rim and pouring spout: support controlled pouring","Graduated markings: give approximate volume readings","Cylindrical body: contains liquids or mixtures","Flat base: allows the beaker to stand on a bench or heatproof mat"]),
        instructionsJson: JSON.stringify(["Check the beaker for cracks or chips before use.","Place it on a level bench or heatproof mat.","Pour the liquid slowly, keeping the spout directed away from people.","Read the approximate volume at eye level.","If heating is required, use teacher-approved equipment and suitable heat protection.","Allow hot glassware to cool in a safe place; never handle hot glass with bare hands."]),
        activitiesJson: JSON.stringify(["Pour 50 mL and 100 mL of water and compare approximate readings.","Mix water and salt using a glass stirring rod.","Compare a beaker reading with a measuring cylinder reading and discuss accuracy."]),
        safetyJson: JSON.stringify(["Do not use cracked glassware.","Use goggles and follow the teacher's instructions when heating.","Assume heated glass is hot even when it does not look hot.","Never heat a sealed container."]),
        mistakesJson: JSON.stringify(["Treating beaker graduations as precise measurements","Reading the scale from above or below eye level","Placing hot glass on a cold or wet surface"]),
        teacherGuidance: "Explain the difference between approximate beaker measurements and accurate volumetric measurements using a measuring cylinder or pipette.",
        studentExercises: "1. State two uses of a beaker. 2. Why is a measuring cylinder preferred for accurate volume measurement? 3. List three precautions when heating liquids.",
        curriculumReference: "SHS Chemistry: laboratory apparatus, measurement and safe practical work.", previewText: "Identify beaker parts, understand approximate graduations and practise safe handling."
      },
      {
        slug: "laboratory-thermometer", title: "Laboratory Thermometer", summary: "Measure temperature changes during experiments.", description: "A laboratory thermometer measures the temperature of substances during experiments. Students should read the scale at eye level and avoid allowing the bulb to touch the container.",
        subject: "Integrated Science", levelBand: "jhs" as const, classes: ["JHS 1", "JHS 2"], topic: "Temperature and heat", category: "Laboratory Equipment", activity: "Measure the temperature of water at different conditions.",
        componentsJson: JSON.stringify(["Bulb: contains the temperature-sensitive material","Stem: protects and supports the capillary","Scale: displays temperature values","Capillary: narrow tube in which the indicator moves"]),
        instructionsJson: JSON.stringify(["Check the thermometer for damage and identify its scale and range.","Place the bulb in the liquid without touching the sides or bottom of the container.","Wait until the reading becomes steady.","Keep your eye level with the top of the liquid column.","Record the temperature with the correct unit, usually degrees Celsius.","Remove and clean the thermometer as directed by the teacher."]),
        activitiesJson: JSON.stringify(["Compare the temperature of room-temperature and warm water.","Record temperature at regular intervals as warm water cools.","Plot a simple temperature-against-time graph."]),
        safetyJson: JSON.stringify(["Do not use a cracked thermometer.","Do not use a laboratory thermometer to taste or stir substances.","Avoid temperatures outside the thermometer's stated range.","Report spills or breakages to the teacher."]),
        mistakesJson: JSON.stringify(["Allowing the bulb to touch the container","Reading before the indicator becomes steady","Viewing the scale from an angle","Forgetting to record the unit"]),
        teacherGuidance: "Use water at safe temperatures for demonstrations. Discuss why a thermometer must be suitable for the expected temperature range.",
        studentExercises: "1. State the function of the bulb. 2. Why should the bulb not touch the container? 3. Record and compare three temperature readings in degrees Celsius.",
        curriculumReference: "Ghana NaCCA JHS Science: heat, temperature and measurement.", previewText: "Learn to position, read and care for a laboratory thermometer."
      },
      {
        slug: "digital-multimeter", title: "Digital Multimeter", summary: "Measure voltage, current and resistance in basic electrical circuits.", description: "A digital multimeter is an electronic test instrument used to measure electrical quantities. Correct socket selection, range selection and connection method are essential for safe and valid readings.",
        subject: "Physics", levelBand: "shs" as const, classes: ["SHS 1", "SHS 2", "SHS 3"], topic: "Electricity and electrical measurement", category: "Workshop Tools", activity: "Measure the voltage of a low-voltage battery under teacher supervision.",
        componentsJson: JSON.stringify(["Display: shows the measured value","Rotary selector: selects measurement type and range","COM socket: common test-lead connection","V/Ω socket: voltage and resistance input","A or mA socket: current input, depending on model","Test probes: make contact with circuit points"]),
        instructionsJson: JSON.stringify(["Inspect the meter, leads and probe insulation for damage.","Read the meter's manual and identify the correct input sockets.","For a low-voltage battery, select DC voltage and a range above the expected value.","Connect the black lead to COM and the red lead to the voltage socket.","Touch the probes to the battery terminals with correct polarity and read the display.","Switch off and remove the probes after the measurement. Return the selector to OFF."]),
        activitiesJson: JSON.stringify(["Measure a teacher-approved low-voltage cell or battery.","Compare readings from two cells connected separately.","Discuss why voltage is measured in parallel and current in series, using a safe demonstration circuit."]),
        safetyJson: JSON.stringify(["Students must not measure mains electricity.","Never measure resistance on an energised circuit.","Never place probes across a power source while the lead is in the current socket.","Use only intact insulated probes and teacher-approved low-voltage sources."]),
        mistakesJson: JSON.stringify(["Using the current socket for voltage measurement","Selecting AC instead of DC for a battery","Measuring resistance on a live circuit","Allowing probe tips to short circuit a battery"]),
        teacherGuidance: "Keep student work to extra-low-voltage batteries and protected educational circuit kits. Demonstrate socket selection before learners handle the meter.",
        studentExercises: "1. Name three quantities measured by a multimeter. 2. Explain why voltage is measured in parallel. 3. Give two safety precautions.",
        curriculumReference: "SHS Physics: current electricity, potential difference and electrical measurement.", previewText: "Explore multimeter parts and safe low-voltage measurement."
      }
    ];
    const now = Date.now();
    for (const item of starter) {
      await ctx.db.insert("teachingResources", {
        ...item, access: "free", status: "published", createdBy: email,
        createdAt: now, updatedAt: now,
      });
    }
    return { created: starter.length, message: "Starter practical resources published." };
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
    return { url: `${(process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://perfect-lark-521.convex.site").replace(/\\/$/, "")}/teaching-resource-download?token=${token}`, expiresInSeconds: 90 };
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
