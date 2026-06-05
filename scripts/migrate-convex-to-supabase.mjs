#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const args = new Map(
  process.argv.slice(2).map((arg, index, all) => {
    if (!arg.startsWith("--")) return [String(index), arg];
    const [key, value] = arg.includes("=") ? arg.split(/=(.*)/s) : [arg, all[index + 1]];
    return [key.replace(/^--/, ""), value ?? "true"];
  })
);

const exportDir = args.get("dir") || args.get("input");
const dryRun = args.get("dry-run") === "true";
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!exportDir) {
  console.error("Usage: node scripts/migrate-convex-to-supabase.mjs --dir ./convex-export [--dry-run]");
  process.exit(1);
}

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

async function pathExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readRows(table) {
  const candidates = [
    path.join(exportDir, `${table}.json`),
    path.join(exportDir, `${table}.jsonl`),
    path.join(exportDir, table, "documents.json"),
    path.join(exportDir, table, "documents.jsonl"),
  ];

  for (const file of candidates) {
    if (!(await pathExists(file))) continue;
    const raw = await readFile(file, "utf8");
    if (!raw.trim()) return [];
    if (file.endsWith(".jsonl")) {
      return raw
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.documents ?? parsed.rows ?? [];
  }
  return [];
}

function iso(ms) {
  return new Date(ms || Date.now()).toISOString();
}

async function request(table, method, query, body) {
  if (dryRun) return [];
  const url = `${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (!res.ok) {
    throw new Error(`${method} ${table} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function upsert(table, rows, onConflict) {
  if (!rows.length) return [];
  const query = new URLSearchParams({ on_conflict: onConflict, select: "*" });
  return await request(table, "POST", query.toString(), rows);
}

async function main() {
  const [users, conversations, messages, chats, mediaJobs, payments, transactions, creditLogs] =
    await Promise.all([
      readRows("users"),
      readRows("conversations"),
      readRows("messages"),
      readRows("chats"),
      readRows("mediaJobs"),
      readRows("payments"),
      readRows("transactions"),
      readRows("creditLogs"),
    ]);

  console.log("Convex export rows:", {
    users: users.length,
    conversations: conversations.length,
    messages: messages.length,
    legacyChats: chats.length,
    mediaJobs: mediaJobs.length,
    payments: payments.length,
    transactions: transactions.length,
    creditLogs: creditLogs.length,
  });

  const usersByEmail = new Map();
  const userRows = users
    .filter((u) => u.email)
    .map((u) => ({
      email: String(u.email).trim().toLowerCase(),
      name: u.name ?? null,
      avatar_url: u.image ?? null,
      credits: u.credits ?? 25,
      tokens: u.tokens ?? 1000,
      plan: u.plan ?? "free",
      tier: u.tier === "premium" ? "premium" : "free",
      subscription_plan: u.subscriptionPlan ?? "free",
      subscription_expires_at: u.subscriptionExpiresAt ? iso(u.subscriptionExpiresAt) : null,
      starter_credits_granted: Boolean(u.starterCreditsGranted),
      interest_profile: u.interestProfile ? JSON.parse(u.interestProfile) : null,
      convex_user_id: u._id ?? String(u.email).trim().toLowerCase(),
      created_at: iso(u._creationTime),
    }));

  for (const row of await upsert("users", userRows, "email")) {
    usersByEmail.set(String(row.email).toLowerCase(), row);
  }

  for (const row of userRows) {
    if (!usersByEmail.has(row.email)) usersByEmail.set(row.email, row);
  }

  function userFor(convexUserId) {
    const email = String(convexUserId || "").trim().toLowerCase();
    return usersByEmail.get(email) ?? null;
  }

  const chatRows = conversations
    .map((c) => {
      const user = userFor(c.userId);
      if (!user?.id) return null;
      return {
        user_id: user.id,
        convex_conversation_id: c._id,
        title: c.title ?? "New chat",
        mode: c.mode ?? "general",
        created_at: iso(c.createdAt ?? c._creationTime),
        updated_at: iso(c.updatedAt ?? c.createdAt ?? c._creationTime),
      };
    })
    .filter(Boolean);

  const importedChats = await upsert("chats", chatRows, "convex_conversation_id");
  const chatsByConvexId = new Map(importedChats.map((c) => [c.convex_conversation_id, c]));

  const messageRows = messages
    .map((m) => {
      const chat = chatsByConvexId.get(m.conversationId);
      if (!chat?.id) return null;
      return {
        chat_id: chat.id,
        convex_message_id: m._id,
        role: m.role,
        content: m.content,
        created_at: iso(m.createdAt ?? m._creationTime),
      };
    })
    .filter(Boolean);

  await upsert("chat_messages", messageRows, "convex_message_id");

  const legacyMessageRows = chats
    .map((m) => {
      const user = userFor(m.userId);
      if (!user?.id) return null;
      return {
        user_id: user.id,
        convex_conversation_id: `legacy:${m.userId}`,
        title: "Legacy chat",
        mode: "general",
        created_at: iso(m.createdAt ?? m._creationTime),
        updated_at: iso(m.createdAt ?? m._creationTime),
      };
    })
    .filter(Boolean);
  const importedLegacyChats = await upsert("chats", legacyMessageRows, "convex_conversation_id");
  const legacyChatsByUser = new Map(
    importedLegacyChats.map((chat) => [chat.convex_conversation_id.replace(/^legacy:/, ""), chat])
  );
  const legacyMessages = chats
    .map((m) => {
      const chat = legacyChatsByUser.get(String(m.userId || "").trim().toLowerCase());
      if (!chat?.id) return null;
      return {
        chat_id: chat.id,
        convex_message_id: m._id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.message ?? "",
        created_at: iso(m.createdAt ?? m._creationTime),
      };
    })
    .filter(Boolean);
  await upsert("chat_messages", legacyMessages, "convex_message_id");

  const generationRows = mediaJobs
    .map((job) => {
      const user = userFor(job.userId);
      if (!user?.id) return null;
      return {
        user_id: user.id,
        convex_job_id: job._id,
        media_type: job.mediaType,
        category: job.category ?? "general",
        prompt: job.prompt ?? "",
        provider_prediction_id: job.replicatePredictionId ?? null,
        status: job.status ?? "pending",
        output_url: job.outputUrl ?? null,
        credits_charged: job.creditsCharged ?? 0,
        error_message: job.errorMessage ?? null,
        created_at: iso(job.createdAt ?? job._creationTime),
      };
    })
    .filter(Boolean);
  await upsert("generations", generationRows, "convex_job_id");

  const paymentRows = payments
    .map((payment) => {
      const user = userFor(payment.userId);
      if (!user?.id) return null;
      return {
        user_id: user.id,
        provider: payment.provider ?? "paystack",
        reference: payment.reference,
        product_id: payment.productId ?? "unknown",
        type: payment.type ?? "credits",
        amount_ghs: payment.amountGhs ?? null,
        plan_id: payment.planId ?? null,
        credits_granted: payment.creditsGranted ?? null,
        status: payment.status ?? "pending",
        provider_response: payment.paystackResponse ? JSON.parse(payment.paystackResponse) : null,
        convex_payment_id: payment._id,
        created_at: iso(payment.createdAt ?? payment._creationTime),
      };
    })
    .filter(Boolean);
  await upsert("payments", paymentRows, "reference");

  const tokenRows = [
    ...transactions.map((tx) => ({
      source: tx,
      action: "legacy_purchase",
      amount: tx.amount,
      tokens: tx.tokens,
      reference: tx.reference,
      balance_after: null,
      metadata: null,
    })),
    ...creditLogs.map((log) => ({
      source: log,
      action: log.action,
      amount: log.amount,
      tokens: log.amount,
      reference: log.reference ?? log._id,
      balance_after: log.balanceAfter ?? null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    })),
  ]
    .map((entry) => {
      const user = userFor(entry.source.userId);
      if (!user?.id) return null;
      return {
        user_id: user.id,
        amount: entry.amount ?? 0,
        reference: entry.reference,
        tokens: entry.tokens ?? 0,
        action: entry.action,
        balance_after: entry.balance_after,
        metadata: entry.metadata,
        convex_transaction_id: entry.source._id,
        created_at: iso(entry.source.createdAt ?? entry.source._creationTime),
      };
    })
    .filter(Boolean);
  await upsert("token_transactions", tokenRows, "convex_transaction_id");

  console.log(
    dryRun
      ? "Dry run complete. No Supabase rows were written."
      : "Migration complete. Convex remains the live execution backend until the feature flag is changed."
  );

  const rootFiles = await readdir(exportDir).catch(() => []);
  console.log("Processed export files/directories:", rootFiles.sort());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

