import { query } from "./_generated/server";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { isPhase6FlagEnabled } from "./phase6Controls";

/**
 * AI platform enhancement catalog — feature list only until individually wired.
 * Cost/usage monitoring hooks into existing aiUsageAnalytics when enabled.
 */
export const getAiPlatformCatalog = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    if (!(await isPhase6FlagEnabled(ctx, "phase6.ai_platform"))) {
      return { enabled: false as const };
    }
    await requireSession(args.sessionToken);
    return {
      enabled: true as const,
      features: [
        {
          id: "assistant",
          label: "Improved AI Assistant",
          status: "available",
          href: "/chat/",
        },
        {
          id: "workspace",
          label: "AI Workspace enhancements",
          status: "available",
          href: "/workspace/",
        },
        {
          id: "research",
          label: "AI research tools",
          status: "beta",
          href: "/chat/",
        },
        {
          id: "documents",
          label: "AI document assistance",
          status: "beta",
          href: "/chat/",
        },
        {
          id: "translation",
          label: "AI translation",
          status: "planned",
          href: "/chat/",
        },
        {
          id: "productivity",
          label: "AI productivity features",
          status: "beta",
          href: "/workspace/",
        },
      ],
      controls: {
        userCanDisablePersonalization: true,
        usageMonitoring: true,
        costMonitoring: true,
      },
      note: "New AI surfaces stay behind this flag; existing Chat modes unchanged.",
    };
  },
});
