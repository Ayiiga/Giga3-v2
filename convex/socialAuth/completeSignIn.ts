import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { googleProfilePatch } from "../googleAccountLink";
import {
  decideSocialAccountLink,
  decideSocialExplicitLink,
  type SocialLinkRejectCode,
} from "./accountLink";

const providerValidator = v.union(
  v.literal("google"),
  v.literal("apple"),
  v.literal("microsoft"),
  v.literal("github")
);

export type SocialSignInResult =
  | { ok: true; kind: "create" | "sign-in" | "link"; email: string }
  | { ok: false; code: SocialLinkRejectCode };

function suspended(user: { accountStatus?: "active" | "suspended" } | null): boolean {
  return user?.accountStatus === "suspended";
}

/**
 * Create / sign-in / explicit-link for a verified social identity.
 * Does not mint a session. Never auto-merges on email alone.
 */
export const completeSocialSignInInternal = internalMutation({
  args: {
    provider: providerValidator,
    subject: v.string(),
    email: v.optional(v.string()),
    emailVerified: v.boolean(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    /** When set, this is an authenticated link for the session user. */
    linkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SocialSignInResult> => {
    const subject = args.subject.trim();
    const email = args.email?.trim().toLowerCase() ?? "";
    const now = Date.now();

    const bySubject = await ctx.db
      .query("authProviderIdentities")
      .withIndex("by_provider_subject", (q) =>
        q.eq("provider", args.provider).eq("subject", subject)
      )
      .first();

    // Legacy Google: users.googleSub still authoritative for returning GIS users.
    let legacyGoogleUser =
      args.provider === "google" && !bySubject
        ? await ctx.db
            .query("users")
            .withIndex("by_googleSub", (q) => q.eq("googleSub", subject))
            .first()
        : null;

    if (args.linkUserId) {
      const sessionUserId = args.linkUserId.trim().toLowerCase();
      const sessionUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", sessionUserId))
        .first();
      if (!sessionUser || suspended(sessionUser)) {
        return { ok: false, code: "suspended" };
      }
      const existingForUser = await ctx.db
        .query("authProviderIdentities")
        .withIndex("by_user_provider", (q) =>
          q.eq("userId", sessionUserId).eq("provider", args.provider)
        )
        .first();

      // Apple repeat authorize may omit email — allow link only when subject already
      // belongs to this user, or email matches.
      const effectiveEmail = email || sessionUserId;
      const decision = decideSocialExplicitLink({
        subject,
        email: effectiveEmail,
        emailVerified: email ? args.emailVerified : true,
        sessionUserId,
        bySubject: bySubject
          ? { userId: bySubject.userId, suspended: false }
          : legacyGoogleUser
            ? { userId: legacyGoogleUser.email, suspended: suspended(legacyGoogleUser) }
            : null,
        existingSubjectForUser: existingForUser?.subject ?? null,
      });
      if (decision.kind === "reject") {
        return { ok: false, code: decision.code };
      }
      if (decision.kind === "sign-in") {
        if (bySubject) {
          await ctx.db.patch(bySubject._id, { lastLoginAt: now });
        }
        return { ok: true, kind: "sign-in", email: sessionUserId };
      }
      await ctx.db.insert("authProviderIdentities", {
        provider: args.provider,
        subject,
        userId: sessionUserId,
        emailAtLink: email || undefined,
        createdAt: now,
        lastLoginAt: now,
      });
      if (args.provider === "google") {
        await ctx.db.patch(sessionUser._id, { googleSub: subject });
      }
      const profile = googleProfilePatch({
        name: args.name,
        picture: args.image,
        existingName: sessionUser.name,
        existingImage: sessionUser.image,
      });
      if (Object.keys(profile).length > 0) {
        await ctx.db.patch(sessionUser._id, profile);
      }
      return { ok: true, kind: "link", email: sessionUserId };
    }

    // Sign-in / create path
    if (bySubject || legacyGoogleUser) {
      const userId = (bySubject?.userId ?? legacyGoogleUser!.email).trim().toLowerCase();
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", userId))
        .first();
      if (!user || suspended(user)) {
        return { ok: false, code: "suspended" };
      }
      if (bySubject) {
        await ctx.db.patch(bySubject._id, { lastLoginAt: now });
      } else if (legacyGoogleUser) {
        await ctx.db.insert("authProviderIdentities", {
          provider: "google",
          subject,
          userId,
          emailAtLink: email || userId,
          createdAt: now,
          lastLoginAt: now,
        });
      }
      const profile = googleProfilePatch({
        name: args.name,
        picture: args.image,
        existingName: user.name,
        existingImage: user.image,
      });
      if (Object.keys(profile).length > 0) {
        await ctx.db.patch(user._id, profile);
      }
      return { ok: true, kind: "sign-in", email: userId };
    }

    // Apple returning user without email in token and no stored identity — cannot create.
    if (!email) {
      return { ok: false, code: "invalid_identity" };
    }

    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const decision = decideSocialAccountLink({
      provider: args.provider,
      subject,
      email,
      emailVerified: args.emailVerified,
      bySubject: null,
      byEmail: byEmail
        ? { userId: byEmail.email, suspended: suspended(byEmail) }
        : null,
    });

    if (decision.kind === "reject") {
      return { ok: false, code: decision.code };
    }

    if (decision.kind === "create") {
      const ensured = await ctx.runMutation(internal.users.ensureUserInternal, {
        email: decision.email,
      });
      const created = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", ensured.email))
        .first();
      if (!created) {
        return { ok: false, code: "invalid_identity" };
      }
      const profile = googleProfilePatch({
        name: args.name,
        picture: args.image,
      });
      await ctx.db.patch(created._id, {
        ...(args.provider === "google" ? { googleSub: subject } : {}),
        emailVerificationTime: created.emailVerificationTime ?? now,
        ...profile,
      });
      await ctx.db.insert("authProviderIdentities", {
        provider: args.provider,
        subject,
        userId: created.email,
        emailAtLink: email,
        createdAt: now,
        lastLoginAt: now,
      });
      return { ok: true, kind: "create", email: created.email };
    }

    // decideSocialAccountLink no longer returns link for sign-in path
    return { ok: false, code: "invalid_identity" };
  },
});
