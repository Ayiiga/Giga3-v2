import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireSession } from "../auth";
import {
  EXTERNAL_CONNECTORS,
  PLATFORM_CONNECTORS,
  isProviderConfigured,
  missingEnvKeysForProvider,
} from "./registry";
import {
  CONNECTOR_STATUS_LABELS,
  type ConnectorCardView,
  type ConnectorStatus,
} from "./types";

function platformCards(): ConnectorCardView[] {
  return PLATFORM_CONNECTORS.map((p) => ({
    id: p.id,
    label: p.label,
    category: p.category,
    description: p.description,
    status: "active" as const,
    statusLabel: CONNECTOR_STATUS_LABELS.active,
    href: p.href,
    capabilities: p.capabilities,
    canConnect: false,
    canDisconnect: false,
    canReconnect: false,
  }));
}

export const listConnectorStatuses = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let userId: string | null = null;
    if (args.sessionToken) {
      try {
        userId = await requireSession(args.sessionToken, ctx);
      } catch {
        userId = null;
      }
    }

    const connections = userId
      ? await ctx.db
          .query("connectorConnections")
          .withIndex("by_user", (q) => q.eq("userId", userId!))
          .collect()
      : [];

    const byProvider = new Map(connections.map((c) => [c.provider, c]));
    const external: ConnectorCardView[] = EXTERNAL_CONNECTORS.map((provider) => {
      const missing = missingEnvKeysForProvider(provider);
      const configured = isProviderConfigured(provider);
      const conn = byProvider.get(provider.id);

      let status: ConnectorStatus = "needs_configuration";
      if (!configured) {
        status = "needs_configuration";
      } else if (conn?.status === "connected") {
        status = "connected";
      } else if (conn?.status === "needs_reauth") {
        status = "needs_reauth";
      } else if (conn?.status === "error") {
        status = "temporarily_unavailable";
      } else {
        status = "available";
      }

      const connected = status === "connected";
      const needsReauth = status === "needs_reauth";

      return {
        id: provider.id,
        label: provider.label,
        category: provider.category,
        description: provider.description,
        status,
        statusLabel: CONNECTOR_STATUS_LABELS[status],
        capabilities: provider.capabilities,
        setupNotes: provider.setupNotes,
        accountLabel: conn?.accountLabel ?? null,
        connectedAt: conn?.connectedAt ?? null,
        missingEnvKeys: missing,
        mayNeedProviderApproval: provider.mayNeedProviderApproval,
        canConnect: configured && !connected,
        canDisconnect: Boolean(conn && conn.status !== "revoked"),
        canReconnect: needsReauth || (configured && !connected),
      };
    });

    const cards = [...platformCards(), ...external];
    const summary = {
      active: cards.filter((c) => c.status === "active" || c.status === "connected")
        .length,
      available: cards.filter((c) => c.status === "available").length,
      needsConfiguration: cards.filter((c) => c.status === "needs_configuration")
        .length,
      needsReauth: cards.filter((c) => c.status === "needs_reauth").length,
    };

    return { cards, summary, authenticated: Boolean(userId) };
  },
});
