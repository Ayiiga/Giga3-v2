"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createHash, randomBytes } from "node:crypto";
import { requireSessionWithMonitoring } from "./auth";

export const API_KEY_SCOPES = [
  "chat:read",
  "chat:write",
  "gigalearn:read",
  "gigalearn:write",
  "media:read",
] as const;

function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey.trim()).digest("hex");
}

function generateApiKeyMaterial(): { rawKey: string; prefix: string; hash: string } {
  const rawKey = `giga3_sk_${randomBytes(24).toString("base64url")}`;
  return { rawKey, prefix: rawKey.slice(0, 16), hash: hashApiKey(rawKey) };
}

export const createKey = action({
  args: {
    sessionToken: v.string(),
    label: v.string(),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const email = await requireSessionWithMonitoring(args.sessionToken, ctx);
    await ctx.runQuery(internal.apiKeys.assertApiAccessInternal, { userId: email });

    const label = args.label.trim().slice(0, 80) || "API key";
    const scopes = args.scopes.filter((s) =>
      (API_KEY_SCOPES as readonly string[]).includes(s)
    );
    if (scopes.length === 0) {
      throw new Error("Select at least one valid scope.");
    }

    const { rawKey, prefix, hash } = generateApiKeyMaterial();
    const keyId = await ctx.runMutation(internal.apiKeys.insertKeyInternal, {
      userId: email,
      label,
      keyPrefix: prefix,
      keyHash: hash,
      scopes,
    });

    return { keyId, rawKey, keyPrefix: prefix, scopes, label };
  },
});

export const verifyKeyInternal = internalAction({
  args: { rawKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.apiKeys.verifyKeyInternal, {
      keyHash: hashApiKey(args.rawKey),
    });
  },
});
