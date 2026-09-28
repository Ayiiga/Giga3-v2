import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";
import { getFrontendBaseUrl, sendEmail } from "./emailClient";
import { internal } from "./_generated/api";

const inviteRoleValidator = v.union(
  v.literal("tester"),
  v.literal("creator"),
  v.literal("admin")
);

function newMagicToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const listInvites = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    try {
      await ensureAdminAccess(args);
    } catch {
      return null;
    }
    const rows = await ctx.db
      .query("adminInvites")
      .withIndex("by_status_invited", (q) => q.eq("status", "pending"))
      .order("desc")
      .take(100);
    const all = await ctx.db.query("adminInvites").order("desc").take(500);
    const accepted = all.filter((row) => row.status === "accepted").length;
    const total = all.length;
    return {
      pending: rows,
      stats: {
        total,
        accepted,
        acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      },
    };
  },
});

export const revokeInvite = mutation({
  args: {
    ...adminCredentialArgs,
    inviteId: v.id("adminInvites"),
  },
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    const row = await ctx.db.get(args.inviteId);
    if (!row) throw new Error("Invite not found.");
    await ctx.db.patch(args.inviteId, { status: "revoked" });
    return { ok: true };
  },
});

export const sendInviteEmail = action({
  args: {
    ...adminCredentialArgs,
    email: v.string(),
    role: inviteRoleValidator,
    invitedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.adminInvitesInternal.ensureAdminAccessInternal, {
      adminSessionToken: args.adminSessionToken,
      adminKey: args.adminKey,
    });
    const magicLinkToken = newMagicToken();
    const record = await ctx.runMutation(internal.adminInvitesInternal.createInviteRecordInternal, {
      adminSessionToken: args.adminSessionToken,
      adminKey: args.adminKey,
      email: args.email,
      role: args.role,
      invitedBy: args.invitedBy,
      magicLinkToken,
    });
    const link = `${getFrontendBaseUrl()}/invite?token=${encodeURIComponent(magicLinkToken)}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
        <h1 style="color:#7c3aed">Explore Giga3 AI</h1>
        <p>Ghana AI Super App for BECE/WASSCE, GigaLearn, GigaEdits, Media Studio, and GigaSocial.</p>
        <p>You were invited as <strong>${args.role}</strong>.</p>
        <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Accept invite</a></p>
        <p style="font-size:12px;color:#666">Or copy: ${link}</p>
      </div>`;
    const result = await sendEmail({
      to: record.email,
      subject: "You're invited to Giga3 AI",
      html,
      text: `Explore Giga3 AI — accept your invite: ${link}`,
      tags: [{ name: "category", value: "admin_invite" }],
    });
    if (!result.ok) {
      throw new Error(result.providerMessage ?? "Could not send invite email.");
    }
    return { ok: true, inviteId: record.inviteId, email: record.email };
  },
});

export const resendInviteEmail = action({
  args: {
    ...adminCredentialArgs,
    inviteId: v.id("adminInvites"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.adminInvitesInternal.ensureAdminAccessInternal, {
      adminSessionToken: args.adminSessionToken,
      adminKey: args.adminKey,
    });
    const row = await ctx.runQuery(internal.adminInvitesInternal.getInviteInternal, {
      inviteId: args.inviteId,
    });
    if (!row || row.status !== "pending") throw new Error("Invite not pending.");
    const link = `${getFrontendBaseUrl()}/invite?token=${encodeURIComponent(row.magicLinkToken)}`;
    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111">
        <h1 style="color:#7c3aed">Reminder: Giga3 AI invite</h1>
        <p><a href="${link}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700">Accept invite</a></p>
      </div>`;
    const result = await sendEmail({
      to: row.email,
      subject: "Reminder: Giga3 AI invite",
      html,
      text: `Accept your Giga3 AI invite: ${link}`,
    });
    if (!result.ok) {
      throw new Error(result.providerMessage ?? "Could not resend invite.");
    }
    await ctx.runMutation(internal.adminInvitesInternal.touchInviteSentInternal, {
      inviteId: args.inviteId,
    });
    return { ok: true };
  },
});
