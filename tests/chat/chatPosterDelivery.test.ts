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

it.each([
  ["a selected upload", null],
  ["Please redesign the poster", "Please redesign the poster"],
  ["Yes, go ahead", "Yes, go ahead"],
  ["Generate it now", "Generate it now"],
  ["Where is the image?", "Where is the image?"],
  ["Please generate the actual visual poster", "Please generate the actual visual poster"],
] as const)("renders a chat poster for %s without a provider call or debit", async (_name, continuation) => {
  const redesign = continuation !== null;
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubEnv("SESSION_SIGNING_SECRET", "poster-delivery-test");
  vi.stubEnv("CHAT_ENABLE_VISION", "false");
  vi.stubGlobal("Buffer", Buffer);
  const external = vi.fn(async () => { throw new Error("Unexpected external request"); });
  vi.stubGlobal("fetch", external);
  const t = convexTest(schema, modules);
  const email = "poster-test@example.com";
  const sessionToken = await createSessionToken(email);
  const now = Date.now() - (redesign ? 60 : 0);
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
  if (redesign) {
    await t.run(async ctx => {
      await ctx.db.insert("messages", {
        conversationId, userId: email, role: "user", createdAt: now,
        content: `Use this\n\n![portrait.png](${photo})`,
      });
      await ctx.db.insert("messages", {
        conversationId, userId: email, role: "assistant", createdAt: now + 1,
        content: "Here is your missing-person poster:\n\nhttps://example.com/old.svg",
      });
      for (let i = 0; i < 30; i++) {
        await ctx.db.insert("messages", { conversationId, userId: email, role: i % 2 ? "assistant" : "user", createdAt: now + 2 + i, content: "Thanks." });
      }
      await ctx.db.insert("messages", {
        conversationId, userId: email, role: "user", createdAt: now + 32, content: "Please redesign the poster",
      });
      await ctx.db.insert("messages", {
        conversationId, userId: email, role: "assistant", createdAt: now + 33,
        content: [
          "Please provide the details for the redesigned poster.",
          "```giga-visual",
          '{"type":"poster","title":"MISSING PERSON","image":{"url":"https://example.com/logo.png","alt":"Placeholder"},',
        ].join("\n"),
      });
    });
  }
  const result = await t.mutation(api.chatMessaging.acceptMessage, {
    sessionToken, conversationId,
    content: continuation ?? `Use this\n\n![portrait.png](${photo})\n\n[Please respond in Twi where possible.]`,
    attachments: redesign ? [] : [{ kind: "image", name: "portrait.png", mimeType: "image/png",
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
  const reply = actual.messages.at(-1)?.content;
  expect(reply).toMatch(/^Here is your missing-person poster:/);
  expect(reply).toMatch(/https?:\/\//);
  expect(reply).not.toMatch(/mermaid|giga-visual/);
  expect(actual.files).toHaveLength(1);
  if (redesign) {
    expect(reply).toContain("Poster design: Bulletin.");
    const svg = await t.run(async ctx => (await ctx.storage.get(actual.files[0]._id))?.text() ?? null);
    expect(svg).toContain('data-poster-design="bulletin"');
    expect(svg).toContain(photo);
    expect(svg).toContain("0200000123");
  }
  expect(actual.user?.credits).toBe(0);
  expect(actual.logs).toEqual([]);
  expect(external).not.toHaveBeenCalled();
});
