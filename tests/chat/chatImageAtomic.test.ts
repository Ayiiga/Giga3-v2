/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.*s");

async function setup(credits: number) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const userId = "image-learner@example.com";
    const user = await ctx.db.insert("users", {
      email: userId, tokens: 0, plan: "free", tier: "free",
      subscriptionPlan: "free", credits, starterCreditsGranted: true,
    });
    const conversation = await ctx.db.insert("conversations", {
      userId, title: "Poster", mode: "general", createdAt: 1, updatedAt: 1,
    });
    const oldReply = await ctx.db.insert("messages", {
      conversationId: conversation, userId, role: "assistant", content: "Old poster", createdAt: 2,
    });
    return { userId, user, conversation, oldReply };
  });
  return { t, ...ids };
}

describe("atomic image delivery", () => {
  it("writes an image and its charge once when delivery is retried", async () => {
    const state = await setup(25);
    const args = {
      conversationId: state.conversation, userId: state.userId,
      content: "Here is your generated image:\n\nhttps://example.com/poster.png",
      since: 3, imageCreditReference: "job-image-1",
    };
    expect((await state.t.mutation(internal.platform.appendAssistantReplyIfMissing, args)).written).toBe(true);
    expect((await state.t.mutation(internal.platform.appendAssistantReplyIfMissing, args)).written).toBe(false);
    const actual = await state.t.run(async ctx => ({
      user: await ctx.db.get(state.user),
      logs: await ctx.db.query("creditLogs").collect(),
      messages: await ctx.db.query("messages").collect(),
    }));
    expect(actual.user?.credits).toBe(23);
    expect(actual.logs).toHaveLength(1);
    expect(actual.messages).toHaveLength(2);
  });

  it("retains the original image if replacement cannot be charged", async () => {
    const state = await setup(1);
    await expect(state.t.mutation(internal.platform.appendAssistantReplyIfMissing, {
      conversationId: state.conversation, userId: state.userId, content: "New poster", since: 3,
      imageCreditReference: "replacement-image", replaceFromMessageId: state.oldReply,
    })).rejects.toThrow("Insufficient credits");
    const actual = await state.t.run(async ctx => ({
      original: await ctx.db.get(state.oldReply),
      user: await ctx.db.get(state.user), logs: await ctx.db.query("creditLogs").collect(),
    }));
    expect(actual.original?.content).toBe("Old poster");
    expect(actual.user?.credits).toBe(1);
    expect(actual.logs).toEqual([]);
  });

  it("replaces a generated image and captures the matching charge atomically", async () => {
    const state = await setup(2);
    const args = {
      conversationId: state.conversation, userId: state.userId, content: "Replacement image", since: 3,
      imageCreditReference: "replacement-image", replaceFromMessageId: state.oldReply,
    };
    await state.t.mutation(internal.platform.appendAssistantReplyIfMissing, args);
    expect((await state.t.mutation(internal.platform.appendAssistantReplyIfMissing, args)).written).toBe(false);
    const actual = await state.t.run(async ctx => ({
      original: await ctx.db.get(state.oldReply),
      user: await ctx.db.get(state.user), logs: await ctx.db.query("creditLogs").collect(),
      messages: await ctx.db.query("messages").collect(),
    }));
    expect(actual.original).toBeNull();
    expect(actual.user?.credits).toBe(0);
    expect(actual.logs).toHaveLength(1);
    expect(actual.messages.map(message => message.content)).toEqual(["Replacement image"]);
  });
});
