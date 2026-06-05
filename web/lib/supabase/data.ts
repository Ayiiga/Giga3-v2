"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { CREDITS_PER_IMAGE, CREDITS_PER_VIDEO } from "@/lib/credits/constants";
import { requireSupabaseClient } from "@/lib/supabase";
import type { ChatRole, Database, MediaType } from "@/types/supabase";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
type MessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];

type SupabaseMessageInput = {
  _id?: string;
  role: string;
  content: string;
  createdAt?: number;
};

function eq(value: string): string {
  return `eq.${value}`;
}

function toMillis(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function mapChat(row: ChatRow): ConversationItem {
  return {
    _id: row.id,
    title: row.title,
    mode: row.mode,
    updatedAt: toMillis(row.updated_at),
    convexConversationId: row.convex_conversation_id,
  };
}

function mapMessage(row: MessageRow) {
  return {
    _id: row.id,
    role: row.role,
    content: row.content,
    createdAt: toMillis(row.created_at),
  };
}

function mapGeneration(row: GenerationRow): MediaJobRow {
  return {
    _id: row.id,
    status: row.status,
    mediaType: row.media_type,
    prompt: row.prompt,
    outputUrl: row.output_url,
    errorMessage: row.error_message,
  };
}

export async function ensureSupabaseUser(email: string): Promise<UserRow> {
  const normalized = email.trim().toLowerCase();
  const [user] = await requireSupabaseClient().upsert(
    "users",
    {
      email: normalized,
      credits: 25,
      tokens: 1000,
      plan: "free",
      tier: "free",
      subscription_plan: "free",
      starter_credits_granted: true,
    },
    { onConflict: "email" }
  );
  if (!user) throw new Error("Could not create Supabase user.");
  return user;
}

export async function getSupabaseCredits(email: string): Promise<number | null> {
  const user = await ensureSupabaseUser(email);
  return user.credits;
}

export async function getSupabaseInterestProfile(email: string): Promise<string | null> {
  const user = await ensureSupabaseUser(email);
  return typeof user.interest_profile === "string"
    ? user.interest_profile
    : user.interest_profile
      ? JSON.stringify(user.interest_profile)
      : null;
}

export async function listSupabaseChats(email: string): Promise<ConversationItem[]> {
  const user = await ensureSupabaseUser(email);
  const params = new URLSearchParams({
    user_id: eq(user.id),
    order: "updated_at.desc",
    select: "*",
  });
  const rows = await requireSupabaseClient().select("chats", params);
  return rows.map(mapChat);
}

export async function createSupabaseChat(
  email: string,
  mode: string,
  title = "New chat"
): Promise<ConversationItem> {
  const user = await ensureSupabaseUser(email);
  const [row] = await requireSupabaseClient().insert("chats", {
    user_id: user.id,
    title,
    mode,
  });
  if (!row) throw new Error("Could not create Supabase chat.");
  return mapChat(row);
}

export async function updateSupabaseChat(
  chatId: string,
  patch: { mode?: string; title?: string; convexConversationId?: string | null }
): Promise<ConversationItem | null> {
  const params = new URLSearchParams({ id: eq(chatId) });
  const [row] = await requireSupabaseClient().update("chats", params, {
    ...(patch.mode ? { mode: patch.mode } : {}),
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.convexConversationId !== undefined
      ? { convex_conversation_id: patch.convexConversationId }
      : {}),
  });
  return row ? mapChat(row) : null;
}

export async function removeSupabaseChat(chatId: string): Promise<void> {
  await requireSupabaseClient().delete(
    "chats",
    new URLSearchParams({ id: eq(chatId) })
  );
}

export async function listSupabaseMessages(chatId: string) {
  const params = new URLSearchParams({
    chat_id: eq(chatId),
    order: "created_at.asc",
    select: "*",
  });
  const rows = await requireSupabaseClient().select("chat_messages", params);
  return rows.map(mapMessage);
}

export async function appendSupabaseMessage(
  chatId: string,
  role: ChatRole,
  content: string
) {
  const [row] = await requireSupabaseClient().insert("chat_messages", {
    chat_id: chatId,
    role,
    content,
  });
  return row ? mapMessage(row) : null;
}

export async function replaceSupabaseMessages(
  chatId: string,
  messages: SupabaseMessageInput[]
): Promise<void> {
  await requireSupabaseClient().delete(
    "chat_messages",
    new URLSearchParams({ chat_id: eq(chatId) })
  );

  const rows = messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "system")
    .map((m) => ({
      chat_id: chatId,
      convex_message_id: m._id ?? null,
      role: m.role as ChatRole,
      content: m.content,
      created_at: new Date(m.createdAt ?? Date.now()).toISOString(),
    }));

  if (rows.length) {
    await requireSupabaseClient().insert("chat_messages", rows);
  }
}

export async function listSupabaseGenerations(email: string): Promise<MediaJobRow[]> {
  const user = await ensureSupabaseUser(email);
  const params = new URLSearchParams({
    user_id: eq(user.id),
    order: "created_at.desc",
    limit: "50",
    select: "*",
  });
  const rows = await requireSupabaseClient().select("generations", params);
  return rows.map(mapGeneration);
}

export async function createSupabaseGeneration(args: {
  email: string;
  mediaType: MediaType;
  category: string;
  prompt: string;
  outputUrl?: string | null;
  status?: "succeeded" | "failed";
  errorMessage?: string | null;
}): Promise<void> {
  const user = await ensureSupabaseUser(args.email);
  await requireSupabaseClient().insert("generations", {
    user_id: user.id,
    media_type: args.mediaType,
    category: args.category,
    prompt: args.prompt,
    status: args.status ?? "succeeded",
    output_url: args.outputUrl ?? null,
    credits_charged:
      args.mediaType === "video" ? CREDITS_PER_VIDEO : CREDITS_PER_IMAGE,
    error_message: args.errorMessage ?? null,
  });
}

