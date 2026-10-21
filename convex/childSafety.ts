/**
 * Child-safety Convex API: age attestation + access snapshot.
 * Server enforcement for social/DM/AI is applied at call sites via helpers here.
 */
import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import {
  ageCategoryFromAttestation,
  approximateAgeYears,
  assertFeatureAllowedForAge,
  type AgeAccessSnapshot,
  type ChildSafetyFeature,
  requiresChildAiMode,
  validateBirthAttestation,
  isFeatureAllowedForAge,
} from "./childSafetyPolicy";
import { ForbiddenError } from "./securityErrors";

type UserAgeFields = {
  email: string;
  birthYear?: number;
  birthMonth?: number;
  ageAttestedAt?: number;
};

export function buildAgeAccessSnapshot(
  user: UserAgeFields | null | undefined,
  nowMs: number = Date.now()
): AgeAccessSnapshot {
  const birthYear = typeof user?.birthYear === "number" ? user.birthYear : null;
  const birthMonth = typeof user?.birthMonth === "number" ? user.birthMonth : null;
  const category = ageCategoryFromAttestation(
    { birthYear, birthMonth },
    nowMs
  );
  const hasAttestation = category !== "unknown";
  return {
    category,
    hasAttestation,
    birthYear,
    birthMonth,
    approximateAge:
      hasAttestation && birthYear != null && birthMonth != null
        ? approximateAgeYears(birthYear, birthMonth, nowMs)
        : null,
    allowsSocialUgc: isFeatureAllowedForAge(category, "social_ugc"),
    allowsSocialDm: isFeatureAllowedForAge(category, "social_dm"),
    requiresChildAiMode: requiresChildAiMode(category),
  };
}

async function loadUserByEmail(
  ctx: { db: any },
  email: string
): Promise<UserAgeFields | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();
  return user ?? null;
}

/** Resolve age access for a signed-in email (session already validated). */
export async function getAgeAccessForEmail(
  ctx: { db: any },
  email: string,
  nowMs: number = Date.now()
): Promise<AgeAccessSnapshot> {
  const user = await loadUserByEmail(ctx, email);
  return buildAgeAccessSnapshot(user, nowMs);
}

/** Enforce a feature gate; throws ForbiddenError when blocked. */
export async function assertChildSafetyFeature(
  ctx: { db: any },
  email: string,
  feature: ChildSafetyFeature,
  nowMs: number = Date.now()
): Promise<AgeAccessSnapshot> {
  const access = await getAgeAccessForEmail(ctx, email, nowMs);
  assertFeatureAllowedForAge(access.category, feature);
  return access;
}

export const getAgeAccess = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    return getAgeAccessForEmail(ctx, email);
  },
});

/** Worker/action helper — email already authenticated by the calling job. */
export const getAgeAccessInternal = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => getAgeAccessForEmail(ctx, args.email),
});

/**
 * Self-attested birth month/year. Minimal data for age banding — no ID documents.
 * Overwriting is allowed (corrections) but logged only as a security event type string.
 */
export const setAgeAttestation = mutation({
  args: {
    ...sessionArgs,
    birthYear: v.number(),
    birthMonth: v.number(),
  },
  handler: async (ctx, args) => {
    const email = await requireSession(args.sessionToken, ctx);
    const now = Date.now();
    const { birthYear, birthMonth } = validateBirthAttestation(
      args.birthYear,
      args.birthMonth,
      now
    );
    const user = await loadUserByEmail(ctx, email);
    if (!user) {
      throw new ForbiddenError("Account not found. Sign in again.");
    }
    const row = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
    if (!row) throw new ForbiddenError("Account not found. Sign in again.");

    await ctx.db.patch(row._id, {
      birthYear,
      birthMonth,
      ageAttestedAt: now,
    });

    return buildAgeAccessSnapshot(
      { email, birthYear, birthMonth, ageAttestedAt: now },
      now
    );
  },
});
