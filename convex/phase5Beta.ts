import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { isPhase5FlagEnabled } from "./phase5Controls";
import {
  betaCohortValidator,
  betaWaitlistStatusValidator,
} from "./schema";
import { RateLimitError } from "./securityErrors";

const WAITLIST_RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_WAITLIST_PER_HOUR = 5;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 200);
}

async function enforceWaitlistRate(ctx: { db: any }, bucketKey: string) {
  const now = Date.now();
  const existing = await ctx.db
    .query("feedbackRateLimits")
    .withIndex("by_bucket", (q: any) => q.eq("bucketKey", bucketKey))
    .first();
  if (!existing || now - existing.windowStartMs >= WAITLIST_RATE_WINDOW_MS) {
    if (existing) {
      await ctx.db.patch(existing._id, { windowStartMs: now, count: 1 });
    } else {
      await ctx.db.insert("feedbackRateLimits", {
        bucketKey,
        windowStartMs: now,
        count: 1,
      });
    }
    return;
  }
  if (existing.count >= MAX_WAITLIST_PER_HOUR) throw new RateLimitError();
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

/** Public: whether beta surfaces are enabled (no secrets). */
export const getBetaPublicConfig = query({
  args: {},
  handler: async (ctx) => {
    const enabled = await isPhase5FlagEnabled(ctx, "phase5.beta");
    return { enabled };
  },
});

/** Join optional waitlist (flag-gated). */
export const joinBetaWaitlist = mutation({
  args: {
    email: v.string(),
    cohort: betaCohortValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.beta"))) {
      throw new Error("Public beta signup is not open yet.");
    }
    const email = normalizeEmail(args.email);
    if (!email.includes("@")) throw new Error("Enter a valid email.");
    await enforceWaitlistRate(ctx, `beta-waitlist:${email}`);

    const existing = await ctx.db
      .query("betaWaitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const now = Date.now();
    if (existing) {
      return { id: existing._id, status: existing.status, alreadyJoined: true };
    }
    const id = await ctx.db.insert("betaWaitlist", {
      email,
      cohort: args.cohort,
      status: "pending",
      reason: args.reason?.trim().slice(0, 400),
      createdAt: now,
      updatedAt: now,
    });
    return { id, status: "pending" as const, alreadyJoined: false };
  },
});

/** Redeem invite code for the signed-in user (flag-gated). */
export const redeemBetaInvite = mutation({
  args: {
    ...sessionArgs,
    code: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.beta"))) {
      throw new Error("Public beta is not open yet.");
    }
    const userId = await requireSession(args.sessionToken);
    const code = normalizeCode(args.code);
    if (code.length < 4) throw new Error("Invalid invite code.");

    const existingMember = await ctx.db
      .query("betaCohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existingMember) {
      return {
        ok: true,
        cohort: existingMember.cohort,
        alreadyMember: true,
      };
    }

    const invite = await ctx.db
      .query("betaInviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!invite || !invite.active) throw new Error("Invite code not found.");
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw new Error("This invite code has expired.");
    }
    if (invite.usedCount >= invite.maxUses) {
      throw new Error("This invite code has already been fully used.");
    }

    await ctx.db.patch(invite._id, { usedCount: invite.usedCount + 1 });
    await ctx.db.insert("betaCohortMembers", {
      userId,
      cohort: invite.cohort,
      inviteCode: code,
      activatedAt: Date.now(),
    });

    const waitlist = await ctx.db
      .query("betaWaitlist")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    if (waitlist) {
      await ctx.db.patch(waitlist._id, {
        status: "activated",
        userId,
        inviteCodeId: invite._id,
        updatedAt: Date.now(),
      });
    }

    return { ok: true, cohort: invite.cohort, alreadyMember: false };
  },
});

/** Current user's beta membership (empty when flag off / not a member). */
export const getMyBetaMembership = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.beta"))) {
      return { enabled: false, member: null };
    }
    let userId: string;
    try {
      userId = await requireSession(args.sessionToken);
    } catch {
      return { enabled: true, member: null };
    }
    const member = await ctx.db
      .query("betaCohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      enabled: true,
      member: member
        ? {
            cohort: member.cohort,
            activatedAt: member.activatedAt,
            onboardedAt: member.onboardedAt,
          }
        : null,
    };
  },
});

/** Mark beta onboarding complete for the signed-in member. */
export const completeBetaOnboarding = mutation({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase5FlagEnabled(ctx, "phase5.beta"))) {
      throw new Error("Public beta is not open yet.");
    }
    const userId = await requireSession(args.sessionToken);
    const member = await ctx.db
      .query("betaCohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!member) throw new Error("Join the beta with an invite code first.");
    if (!member.onboardedAt) {
      await ctx.db.patch(member._id, { onboardedAt: Date.now() });
    }
    return { ok: true };
  },
});

/** Admin: create invite codes. */
export const createBetaInviteAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    code: v.optional(v.string()),
    cohort: betaCohortValidator,
    maxUses: v.optional(v.number()),
    note: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase5FlagEnabled(ctx, "phase5.admin_tools"))) {
      // Allow invite creation when beta itself is enabled for ops convenience.
      if (!(await isPhase5FlagEnabled(ctx, "phase5.beta"))) {
        throw new Error("Enable phase5.beta or phase5.admin_tools first.");
      }
    }
    const code =
      normalizeCode(args.code || "") ||
      `GIGA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await ctx.db
      .query("betaInviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("Invite code already exists.");
    const id = await ctx.db.insert("betaInviteCodes", {
      code,
      cohort: args.cohort,
      maxUses: Math.max(1, Math.min(10_000, args.maxUses ?? 1)),
      usedCount: 0,
      note: args.note?.trim().slice(0, 200),
      expiresAt: args.expiresAt,
      active: true,
      createdAt: Date.now(),
    });
    return { id, code };
  },
});

/** Admin: list invites + waitlist + cohort stats. */
export const listBetaAdmin = query({
  args: {
    ...adminCredentialArgs,
    waitlistStatus: v.optional(betaWaitlistStatusValidator),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const allInvites = await ctx.db.query("betaInviteCodes").take(80);
    allInvites.sort((a, b) => b.createdAt - a.createdAt);

    const waitlist = await ctx.db
      .query("betaWaitlist")
      .withIndex("by_status_created", (q) =>
        q.eq("status", args.waitlistStatus ?? "pending")
      )
      .order("desc")
      .take(50);

    const members = await ctx.db.query("betaCohortMembers").take(200);
    const byCohort: Record<string, number> = {};
    for (const m of members) {
      byCohort[m.cohort] = (byCohort[m.cohort] ?? 0) + 1;
    }

    const activated = members.filter((m) => m.onboardedAt).length;

    return {
      invites: allInvites.slice(0, 40).map((i) => ({
        _id: i._id,
        code: i.code,
        cohort: i.cohort,
        maxUses: i.maxUses,
        usedCount: i.usedCount,
        active: i.active,
        note: i.note,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      })),
      waitlist: waitlist.map((w) => ({
        _id: w._id,
        email: w.email,
        cohort: w.cohort,
        status: w.status,
        reason: w.reason,
        createdAt: w.createdAt,
      })),
      stats: {
        inviteCount: allInvites.length,
        waitlistPending: waitlist.length,
        cohortMembers: members.length,
        onboardedMembers: activated,
        activationRate:
          members.length > 0 ? Math.round((activated / members.length) * 100) : 0,
        byCohort,
        registrationsTracked: members.length,
      },
    };
  },
});

/** Admin: update waitlist status. */
export const updateWaitlistStatusAdmin = mutation({
  args: {
    ...adminCredentialArgs,
    waitlistId: v.id("betaWaitlist"),
    status: betaWaitlistStatusValidator,
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const row = await ctx.db.get(args.waitlistId);
    if (!row) throw new Error("Waitlist entry not found.");
    await ctx.db.patch(args.waitlistId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});
