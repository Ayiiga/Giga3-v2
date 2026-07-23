import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

function readPrefs(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** User-facing compliance & consent summary. */
export const getComplianceControls = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.compliance"))) {
      return { enabled: false as const };
    }
    const userId = await requireSession(args.sessionToken);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", userId))
      .first();
    const prefs = readPrefs(user?.userPreferences);

    return {
      enabled: true as const,
      privacy: {
        shareUsageForPersonalization: prefs.privacyShareUsage !== false,
        settingsHref: "/home/",
      },
      consent: {
        canDisablePersonalization: true,
        marketingOptInTracked: false,
      },
      dataRetention: {
        policyHref: "/legal/privacy/",
        chatHistoryUserControlled: true,
      },
      contentGovernance: {
        reportContentViaFeedback: true,
        feedbackHref: "in-app feedback",
      },
      jurisdictionsNote:
        "Controls prepare for multi-jurisdiction expansion; Ghana defaults remain.",
    };
  },
});

/** Admin governance snapshot. */
export const getComplianceAdmin = query({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    if (!(await isPhase6FlagEnabled(ctx, "phase6.compliance"))) {
      return { enabled: false as const };
    }
    const audit = await ctx.db.query("orgAuditLogs").take(50);
    const security = await ctx.db.query("securityEvents").take(50);
    return {
      enabled: true as const,
      auditLogSamples: audit.length,
      securityEventSamples: security.length,
      adminControlsReady: true,
      contentGovernanceReady: true,
    };
  },
});
