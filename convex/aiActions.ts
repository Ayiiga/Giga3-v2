"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";

/**
 * @deprecated Legacy token-based chat. Use chatMessaging.acceptMessage + credits instead.
 * Kept as a stub so stale clients fail safely without minting sessions from email.
 */
export const askAI = action({
  args: {
    sessionToken: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, ctx);
    throw new Error(
      "This chat endpoint is retired. Open Giga3 Chat at /chat/ — messages use credits, not legacy tokens."
    );
  },
});
