import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isSubscriptionActive } from "./creditsConfig";
import type { SubscriptionPlanId } from "./subscriptionPlans";

type DbCtx = { db: any };

export type UploadPlanId = SubscriptionPlanId;

export type UploadLimitConfig = {
  planId: UploadPlanId;
  label: string;
  filesPerDay: number;
  imagesPerDay: number;
  maxFileBytes: number;
};

export const DEFAULT_UPLOAD_LIMITS: Record<UploadPlanId, UploadLimitConfig> = {
  free: {
    planId: "free",
    label: "Free",
    filesPerDay: 10,
    imagesPerDay: 5,
    maxFileBytes: 10 * 1024 * 1024,
  },
  basic: {
    planId: "basic",
    label: "Starter",
    filesPerDay: 50,
    imagesPerDay: 20,
    maxFileBytes: 50 * 1024 * 1024,
  },
  pro: {
    planId: "pro",
    label: "Pro",
    filesPerDay: 100,
    imagesPerDay: 40,
    maxFileBytes: 100 * 1024 * 1024,
  },
  premium: {
    planId: "premium",
    label: "Premium",
    filesPerDay: 500,
    imagesPerDay: 200,
    maxFileBytes: 500 * 1024 * 1024,
  },
};

function dateKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

async function getUserByEmail(ctx: DbCtx, email: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email.trim().toLowerCase()))
    .first();
}

async function getLimitForPlan(
  ctx: DbCtx,
  planId: UploadPlanId
): Promise<UploadLimitConfig> {
  const defaults = DEFAULT_UPLOAD_LIMITS[planId] ?? DEFAULT_UPLOAD_LIMITS.free;
  const override = await ctx.db
    .query("uploadLimitSettings")
    .withIndex("by_plan", (q: any) => q.eq("planId", planId))
    .first();
  if (!override) return defaults;
  return {
    ...defaults,
    filesPerDay: Math.max(0, override.filesPerDay),
    imagesPerDay: Math.max(0, override.imagesPerDay),
    maxFileBytes: Math.max(1, override.maxFileBytes),
  };
}

async function getUsageRow(ctx: DbCtx, userId: string, key = dateKey()) {
  return await ctx.db
    .query("usageDaily")
    .withIndex("by_user_date", (q: any) =>
      q.eq("userId", userId).eq("dateKey", key)
    )
    .first();
}

async function getPlanAndLimits(ctx: DbCtx, userId: string) {
  const user = await getUserByEmail(ctx, userId);
  if (!user) throw new Error("User not found");
  const rawPlan = (user.subscriptionPlan ?? "free") as UploadPlanId;
  const planId = isSubscriptionActive(rawPlan, user.subscriptionExpiresAt)
    ? rawPlan
    : "free";
  const limits = await getLimitForPlan(ctx, planId);
  return { user, planId, limits };
}

function snapshotFrom(
  planId: UploadPlanId,
  limits: UploadLimitConfig,
  row: any | null
) {
  const filesUsed = row?.filesUploaded ?? 0;
  const imagesUsed = row?.uploadImagesUsed ?? 0;
  const bytesUsed = row?.uploadBytes ?? 0;
  return {
    dateKey: dateKey(),
    planId,
    planLabel: limits.label,
    filesUsed,
    imagesUsed,
    bytesUsed,
    filesRemaining: Math.max(0, limits.filesPerDay - filesUsed),
    imagesRemaining: Math.max(0, limits.imagesPerDay - imagesUsed),
    limits,
  };
}

export const getUploadUsageSnapshot = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserByEmail(ctx, args.userId);
    if (!user) {
      const limits = await getLimitForPlan(ctx, "free");
      return snapshotFrom("free", limits, null);
    }
    const { planId, limits } = await getPlanAndLimits(ctx, args.userId);
    const row = await getUsageRow(ctx, args.userId);
    return snapshotFrom(planId, limits, row);
  },
});

export const listUploadLimitSettings = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("uploadLimitSettings").collect();
    return (Object.keys(DEFAULT_UPLOAD_LIMITS) as UploadPlanId[]).map((planId) => {
      const override = rows.find((row: any) => row.planId === planId);
      return {
        ...(DEFAULT_UPLOAD_LIMITS[planId] ?? DEFAULT_UPLOAD_LIMITS.free),
        ...(override
          ? {
              filesPerDay: override.filesPerDay,
              imagesPerDay: override.imagesPerDay,
              maxFileBytes: override.maxFileBytes,
              updatedAt: override.updatedAt,
              updatedBy: override.updatedBy ?? null,
            }
          : { updatedAt: null, updatedBy: null }),
      };
    });
  },
});

export const updateUploadLimitSetting = mutation({
  args: {
    adminKey: v.string(),
    planId: v.union(
      v.literal("free"),
      v.literal("basic"),
      v.literal("pro"),
      v.literal("premium")
    ),
    filesPerDay: v.number(),
    imagesPerDay: v.number(),
    maxFileBytes: v.number(),
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.ADMIN_SETTINGS_KEY?.trim();
    if (!expected || args.adminKey !== expected) {
      throw new Error("Admin settings key is invalid");
    }
    const existing = await ctx.db
      .query("uploadLimitSettings")
      .withIndex("by_plan", (q: any) => q.eq("planId", args.planId))
      .first();
    const patch = {
      planId: args.planId,
      filesPerDay: Math.max(0, Math.floor(args.filesPerDay)),
      imagesPerDay: Math.max(0, Math.floor(args.imagesPerDay)),
      maxFileBytes: Math.max(1, Math.floor(args.maxFileBytes)),
      updatedAt: Date.now(),
      updatedBy: args.updatedBy?.trim() || undefined,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return { ...patch, _id: existing._id };
    }
    const id = await ctx.db.insert("uploadLimitSettings", patch);
    return { ...patch, _id: id };
  },
});

export const recordUploads = mutation({
  args: {
    userId: v.string(),
    files: v.array(
      v.object({
        name: v.string(),
        sizeBytes: v.number(),
        mimeType: v.optional(v.string()),
        kind: v.union(
          v.literal("image"),
          v.literal("document"),
          v.literal("archive"),
          v.literal("spreadsheet"),
          v.literal("presentation"),
          v.literal("pdf"),
          v.literal("text")
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    if (args.files.length === 0) return null;
    const { planId, limits } = await getPlanAndLimits(ctx, args.userId);
    const row = await getUsageRow(ctx, args.userId);
    const filesUsed = row?.filesUploaded ?? 0;
    const imagesUsed = row?.uploadImagesUsed ?? 0;
    const bytesUsed = row?.uploadBytes ?? 0;

    const requestedFiles = args.files.length;
    const requestedImages = args.files.filter((file) => file.kind === "image").length;
    const requestedBytes = args.files.reduce((sum, file) => sum + file.sizeBytes, 0);
    const tooLarge = args.files.find((file) => file.sizeBytes > limits.maxFileBytes);
    if (tooLarge) {
      throw new Error(
        `${tooLarge.name} exceeds your ${limits.label} plan file-size limit.`
      );
    }
    if (filesUsed + requestedFiles > limits.filesPerDay) {
      throw new Error(
        `Daily upload limit reached (${limits.filesPerDay} files/day on ${limits.label}).`
      );
    }
    if (imagesUsed + requestedImages > limits.imagesPerDay) {
      throw new Error(
        `Daily image upload limit reached (${limits.imagesPerDay} images/day on ${limits.label}).`
      );
    }

    const key = dateKey();
    const patch = {
      userId: args.userId,
      dateKey: key,
      chatsUsed: row?.chatsUsed ?? 0,
      imagesUsed: row?.imagesUsed ?? 0,
      filesUploaded: filesUsed + requestedFiles,
      uploadImagesUsed: imagesUsed + requestedImages,
      uploadBytes: bytesUsed + requestedBytes,
    };

    if (row) await ctx.db.patch(row._id, patch);
    else await ctx.db.insert("usageDaily", patch);

    return snapshotFrom(planId, limits, patch);
  },
});
