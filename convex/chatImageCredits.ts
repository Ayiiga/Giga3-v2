import type { MutationCtx } from "./_generated/server";
import { CREDIT_COSTS } from "./creditsConfig";
import { normalizeUserId } from "./userIds";

/** Called in the same mutation that persists the image reply. */
export async function chargeChatImageOnce(ctx: Pick<MutationCtx, "db">, userId: string, reference: string) {
  const email = normalizeUserId(userId);
  const previous = await ctx.db.query("creditLogs")
    .withIndex("by_reference", q => q.eq("reference", reference)).collect();
  if (previous.some(entry => entry.userId === email && entry.amount < 0)) return;
  const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", email)).first();
  if (!user) throw new Error("User not found");
  const cost = CREDIT_COSTS.image;
  const balance = user.credits ?? 0;
  if (balance < cost) throw new Error(`Insufficient credits (${cost} required, ${balance} available).`);
  const balanceAfter = balance - cost;
  await ctx.db.patch(user._id, { credits: balanceAfter });
  await ctx.db.insert("creditLogs", {
    userId: email, action: "image", amount: -cost, balanceAfter, reference,
    metadata: JSON.stringify({ source: "chat_image" }), createdAt: Date.now(),
  });
}
