import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { adminCredentialArgs, ensureAdminAccess } from "./adminAccess";

/** One-time (or repeatable) admin action: revoke all paid subscribers except ayiiga3@gmail.com. */
export const revokeLegacySubscribersExceptGrandfathered = mutation({
  args: adminCredentialArgs,
  handler: async (ctx, args) => {
    await ensureAdminAccess(args);
    return await ctx.runMutation(
      internal.subscriptions.revokeLegacySubscribersExceptGrandfathered,
      {}
    );
  },
});
