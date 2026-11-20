/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { Buffer } from "node:buffer";
import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { createSessionToken } from "../../convex/sessionAuth";

const modules = import.meta.glob("../../convex/**/*.*s");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("delivers a saved poster through chat after 'Use this' with no provider call or debit", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubEnv("SESSION_SIGNING_SECRET", "poster-delivery-test");
  vi.stubEnv("CHAT_ENABLE_VISION", "false");
  vi.stubGlobal("Buffer", Buffer);
  const external = vi.fn(async () => { throw new Error("Unexpected external request"); });
  vi.stubGlobal("fetch", external);
  const t = convexTest(schema, modules);
  const email = "poster-test@example.com";
  const sessionToken = await createSessionToken(email);
  const now = Date.now();
  const { user, conversationId } = await t.run(async ctx => {
    const user = await ctx.db.insert("users", {
      email, tokens: 0, plan: "free", tier: "free", credits: 0,
      starterCreditsGranted: true, subscriptionPlan: "free",
    });
    const conversationId = await ctx.db.insert("conversations", {
      userId: email, title: "Missing person poster", mode: "general", createdAt: now - 3, updatedAt: now - 1,
    });
    await ctx.db.insert("messages", {
      conversationId, userId: email, role: "user", createdAt: now - 2,
      content: "MISSING PERSON\nName: Example Subject\nLast seen: 2020 at Example Town\nContact: Example Contact 0200000123",
    });
    await ctx.db.insert("messages", {
      conversationId, userId: email, role: "assistant", createdAt: now - 1,
      content: "Please attach one original photo of the person to use in the poster. No image credits were charged.",
    });
    return { user, conversationId };
  });

  // Simulate the chat composer, which attaches a raster data URL and includes a
  // small inline preview plus the user's language preference in the message.
  const photo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pK0AAAAASUVORK5CYII=";
  const result = await t.mutation(api.chatMessaging.acceptMessage, {
    sessionToken, conversationId,
    content: `Use this\n\n![portrait.png](${photo})\n\n[Please respond in Twi where possible.]`,
    attachments: [{ kind: "image", name: "portrait.png", mimeType: "image/png",
      sizeBytes: Buffer.from(photo.split(",")[1], "base64").length, dataUrl: photo }],
    clientRequestId: "poster-upload-test",
  });
  if (result.status !== "processing") throw new Error(`Unexpected immediate reply: ${result.content}`);
  const job = await t.run(ctx => ctx.db.get(result.jobId));
  expect(job?.kind).toBe("reply");
  await t.action(internal.chatReplyWorker.processJob, { jobId: result.jobId });
  const actual = await t.run(async ctx => ({
    user: await ctx.db.get(user),
    logs: await ctx.db.query("creditLogs").collect(),
    messages: await ctx.db.query("messages").collect(),
    files: await ctx.db.system.query("_storage").collect(),
  }));
  expect(actual.messages.at(-1)?.content).toMatch(/^Here is your missing-person poster:\s+https?:\/\//);
  expect(actual.files).toHaveLength(1);
  expect(actual.user?.credits).toBe(0);
  expect(actual.logs).toEqual([]);
  expect(external).not.toHaveBeenCalled();
});
