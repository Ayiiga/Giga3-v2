import { describe, expect, it } from "vitest";
import { chargeChatImageOnce } from "../../convex/chatImageCredits";
import { resolveChatImagePrompt } from "../../convex/chatImageSource";
import type { MutationCtx } from "../../convex/_generated/server";

function ledger(balance: number) {
  const user = { _id: "user-1", email: "learner@example.com", credits: balance };
  const logs: Array<{ userId: string; amount: number; reference: string; action: string }> = [];
  const db = {
    query(table: string) {
      let reference = "";
      return {
        withIndex(_name: string, build: (query: { eq: (key: string, value: string) => void }) => unknown) {
          build({ eq: (_key, value) => { reference = value; } });
          return {
            first: async () => table === "users" ? user : null,
            collect: async () => logs.filter(row => row.reference === reference),
          };
        },
      };
    },
    patch: async (_id: string, values: { credits: number }) => { user.credits = values.credits; },
    insert: async (_table: string, row: (typeof logs)[number]) => { logs.push(row); },
  };
  return { user, logs, ctx: { db } as unknown as Pick<MutationCtx, "db"> };
}

describe("image delivery credit capture", () => {
  it("deducts two starter credits and prevents a repeated charge for the same delivery", async () => {
    const state = ledger(25);
    await chargeChatImageOnce(state.ctx, state.user.email, "job-1");
    await chargeChatImageOnce(state.ctx, state.user.email, "job-1");
    expect(state.user.credits).toBe(23);
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({ action: "image", amount: -2 });
    await chargeChatImageOnce(state.ctx, state.user.email, "job-2");
    expect(state.user.credits).toBe(21);
  });

  it("rejects an unaffordable image without changing the balance or ledger", async () => {
    const state = ledger(1);
    await expect(chargeChatImageOnce(state.ctx, state.user.email, "job-1")).rejects.toThrow("Insufficient credits");
    expect(state.user.credits).toBe(1);
    expect(state.logs).toEqual([]);
  });

  it("reuses the original brief and excludes the assistant's apology", () => {
    const prompt = resolveChatImagePrompt("I am waiting for the poster", [
      { role: "user", content: "Create a missing person poster for Antwi Christian with this photograph and the supplied contacts." },
      { role: "assistant", content: "I am a text-only assistant and cannot create an image." },
    ]);
    expect(prompt).toContain("Antwi Christian");
    expect(prompt).toContain("Latest instructions: I am waiting for the poster");
    expect(prompt).not.toContain("text-only assistant");
  });
});
