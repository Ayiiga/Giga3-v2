import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import {
  evaluateCreatorVerification,
  normalizeNationalId,
} from "./creatorVerificationPolicy";
import { sessionArgs } from "./validators";
import { toPublicCreatorProfile } from "./marketplaceViews";

function normalizeHandle(handle: string): string {
  return handle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function verificationStatusOf(
  profile: { verificationStatus?: string | null }
): "none" | "pending" | "approved" | "rejected" {
  const status = profile.verificationStatus ?? "none";
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected"
  ) {
    return status;
  }
  return "none";
}

export const getMyProfile = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) return null;
    return {
      ...profile,
      verificationStatus: verificationStatusOf(profile),
      nationalIdMasked: profile.nationalIdNumber
        ? `••••${profile.nationalIdNumber.slice(-4)}`
        : null,
    };
  },
});

export const getByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const handle = normalizeHandle(args.handle);
    if (!handle) return null;
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) return null;
    return toPublicCreatorProfile(profile);
  },
});

export const upsertProfile = mutation({
  args: {
    sessionToken: v.string(),
    displayName: v.string(),
    handle: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const handle = normalizeHandle(args.handle);
    if (!handle || handle.length < 3) {
      throw new Error("Handle must be at least 3 characters.");
    }
    const displayName = args.displayName.trim().slice(0, 80);
    if (!displayName) throw new Error("Display name is required.");

    const taken = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    const existing = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();

    if (taken && taken.userId !== email) {
      throw new Error("Handle is already taken.");
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName,
        handle,
        bio: args.bio?.trim().slice(0, 500),
        avatarUrl: args.avatarUrl,
        website: args.website?.trim().slice(0, 200),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("creatorProfiles", {
      userId: email,
      displayName,
      handle,
      bio: args.bio?.trim().slice(0, 500),
      avatarUrl: args.avatarUrl,
      website: args.website?.trim().slice(0, 200),
      verified: false,
      verificationStatus: "none",
      totalSales: 0,
      totalEarningsGhs: 0,
      payoutBalanceGhs: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const generateVerificationUploadUrl = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile first.");

    const status = verificationStatusOf(profile);
    if (status === "approved") {
      throw new Error("You are already verified.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const submitCreatorVerification = mutation({
  args: {
    sessionToken: v.string(),
    nationalIdNumber: v.string(),
    idDocumentStorageId: v.id("_storage"),
    idDocumentFileName: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    locationAccuracyMeters: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile first.");

    const status = verificationStatusOf(profile);
    if (status === "approved") {
      return { verificationStatus: "approved" as const, verified: true };
    }

    const fileName = args.idDocumentFileName.trim().slice(0, 200);
    if (!fileName) throw new Error("ID document filename is required.");

    const idDocumentMeta = await ctx.storage.getMetadata(args.idDocumentStorageId);
    if (!idDocumentMeta) {
      throw new Error("ID document upload was not found. Please upload again.");
    }

    const nationalIdNumber = normalizeNationalId(args.nationalIdNumber);
    const autoCheck = evaluateCreatorVerification({
      nationalIdNumber,
      latitude: args.latitude,
      longitude: args.longitude,
      locationAccuracyMeters: args.locationAccuracyMeters,
      hasIdDocument: true,
    });
    if (!autoCheck.ok) {
      throw new Error(autoCheck.reason);
    }

    const duplicateId = await ctx.db
      .query("creatorProfiles")
      .filter((q) =>
        q.and(
          q.eq(q.field("nationalIdNumber"), nationalIdNumber),
          q.neq(q.field("userId"), email),
          q.eq(q.field("verificationStatus"), "approved")
        )
      )
      .first();
    if (duplicateId) {
      throw new Error("This national ID is already linked to another verified creator account.");
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      nationalIdNumber,
      idDocumentStorageId: args.idDocumentStorageId,
      idDocumentFileName: fileName,
      latitude: args.latitude,
      longitude: args.longitude,
      locationAccuracyMeters: args.locationAccuracyMeters,
      locationCapturedAt: now,
      verificationStatus: "approved",
      verified: true,
      verificationSubmittedAt: now,
      verificationReviewedAt: now,
      verificationRejectionReason: undefined,
      updatedAt: now,
    });

    return {
      verificationStatus: "approved" as const,
      verified: true,
      message:
        "Verification complete. Your national ID and GPS location were checked automatically — you can publish on the marketplace.",
    };
  },
});

export const requestVerification = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken);
    const profile = await ctx.db
      .query("creatorProfiles")
      .withIndex("by_user", (q) => q.eq("userId", email))
      .first();
    if (!profile) throw new Error("Create a creator profile first.");

    const status = verificationStatusOf(profile);
    if (status === "approved") {
      return { verified: true, verificationStatus: "approved" as const };
    }
    if (status === "pending") {
      return {
        verified: false,
        verificationStatus: "pending" as const,
        message:
          "Verification is incomplete. Resubmit your national ID, document photo, and GPS location for automatic approval.",
      };
    }
    if (status === "rejected") {
      return {
        verified: false,
        verificationStatus: "rejected" as const,
        message:
          profile.verificationRejectionReason ??
          "Verification was rejected. Update your ID document and location, then resubmit.",
      };
    }

    return {
      verified: false,
      verificationStatus: "none" as const,
      message:
        "Submit your national ID, ID document photo, and GPS location to register as a verified creator.",
    };
  },
});
