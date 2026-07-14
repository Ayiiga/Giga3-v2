"use client";

import type { ConversationItem } from "@/components/chat/ChatSidebar";
import type { MediaJobRow } from "@/hooks/useStableMediaJobs";
import { CREDITS_PER_IMAGE, CREDITS_PER_VIDEO } from "@/lib/credits/constants";
import {
  DEFAULT_ONBOARDING,
  DEFAULT_USER_PREFERENCES,
  type OnboardingState,
  type UserPreferences,
} from "@/lib/platform/types";
import type { UserRoleId } from "@/lib/vision";
import { requireSupabaseClient } from "@/lib/supabase";
import type { ChatRole, Database, MediaType } from "@/types/supabase";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type ChatRow = Database["public"]["Tables"]["chats"]["Row"];
type MessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
type GenerationRow = Database["public"]["Tables"]["generations"]["Row"];
type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type TokenTransactionRow =
  Database["public"]["Tables"]["token_transactions"]["Row"];

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

export async function listSupabasePayments(email: string): Promise<PaymentRow[]> {
  const user = await ensureSupabaseUser(email);
  const params = new URLSearchParams({
    user_id: eq(user.id),
    order: "created_at.desc",
    limit: "50",
    select: "*",
  });
  return await requireSupabaseClient().select("payments", params);
}

export async function upsertSupabasePayment(args: {
  email: string;
  provider?: "paystack" | "stripe";
  reference: string;
  productId: string;
  type: "subscription" | "credits";
  amountGhs?: number | null;
  planId?: "free" | "basic" | "pro" | "premium" | null;
  creditsGranted?: number | null;
  status?: "pending" | "success" | "failed";
  providerResponse?: Database["public"]["Tables"]["payments"]["Insert"]["provider_response"];
  convexPaymentId?: string | null;
}): Promise<PaymentRow> {
  const user = await ensureSupabaseUser(args.email);
  const [row] = await requireSupabaseClient().upsert(
    "payments",
    {
      user_id: user.id,
      provider: args.provider ?? "paystack",
      reference: args.reference,
      product_id: args.productId,
      type: args.type,
      amount_ghs: args.amountGhs ?? null,
      plan_id: args.planId ?? null,
      credits_granted: args.creditsGranted ?? null,
      status: args.status ?? "pending",
      provider_response: args.providerResponse ?? null,
      convex_payment_id: args.convexPaymentId ?? null,
    },
    { onConflict: "reference" }
  );
  if (!row) throw new Error("Could not upsert Supabase payment.");
  return row;
}

export async function listSupabaseTokenTransactions(
  email: string
): Promise<TokenTransactionRow[]> {
  const user = await ensureSupabaseUser(email);
  const params = new URLSearchParams({
    user_id: eq(user.id),
    order: "created_at.desc",
    limit: "100",
    select: "*",
  });
  return await requireSupabaseClient().select("token_transactions", params);
}

export async function createSupabaseTokenTransaction(args: {
  email: string;
  amount: number;
  reference: string;
  tokens: number;
  action?: string | null;
  balanceAfter?: number | null;
  metadata?: Database["public"]["Tables"]["token_transactions"]["Insert"]["metadata"];
  convexTransactionId?: string | null;
}): Promise<TokenTransactionRow> {
  const user = await ensureSupabaseUser(args.email);
  const [row] = await requireSupabaseClient().insert("token_transactions", {
    user_id: user.id,
    amount: args.amount,
    reference: args.reference,
    tokens: args.tokens,
    action: args.action ?? null,
    balance_after: args.balanceAfter ?? null,
    metadata: args.metadata ?? null,
    convex_transaction_id: args.convexTransactionId ?? null,
  });
  if (!row) throw new Error("Could not create Supabase token transaction.");
  return row;
}

export type SupabasePlatformProfile = {
  userRole: UserRoleId;
  onboardingState: OnboardingState;
  userPreferences: UserPreferences | null;
  referralCode: string | null;
  learningStreakDays: number;
  onboardingCompletedAt: number | null;
};

function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  return raw as T;
}

function generateReferralCode(email: string): string {
  const base =
    email.split("@")[0]?.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() || "GIGA";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function mapPlatformProfile(user: UserRow): SupabasePlatformProfile {
  const onboardingState = parseJsonField<OnboardingState>(user.onboarding_state, {
    ...DEFAULT_ONBOARDING,
    role: (user.user_role as UserRoleId) ?? DEFAULT_ONBOARDING.role,
    completed: Boolean(user.onboarding_completed_at),
    completedAt: user.onboarding_completed_at
      ? Date.parse(user.onboarding_completed_at)
      : undefined,
  });

  return {
    userRole: (user.user_role as UserRoleId) ?? "general",
    onboardingState,
    userPreferences: parseJsonField<UserPreferences | null>(
      user.user_preferences,
      null
    ),
    referralCode: user.referral_code ?? null,
    learningStreakDays: user.learning_streak_days ?? 0,
    onboardingCompletedAt: user.onboarding_completed_at
      ? Date.parse(user.onboarding_completed_at)
      : null,
  };
}

export async function getSupabasePlatformProfile(
  email: string
): Promise<SupabasePlatformProfile | null> {
  try {
    const user = await ensureSupabaseUser(email);
    return mapPlatformProfile(user);
  } catch {
    return null;
  }
}

export async function saveSupabaseOnboarding(
  email: string,
  args: {
    role: UserRoleId;
    stepsSeen: string[];
    completed: boolean;
  }
): Promise<void> {
  const user = await ensureSupabaseUser(email);
  const now = Date.now();
  const onboardingState: OnboardingState = {
    completed: args.completed,
    completedAt: args.completed ? now : undefined,
    role: args.role,
    stepsSeen: args.stepsSeen,
    dismissedTips: [],
  };

  const [row] = await requireSupabaseClient().update(
    "users",
    new URLSearchParams({ id: eq(user.id) }),
    {
      user_role: args.role,
      onboarding_state: onboardingState,
      onboarding_completed_at: args.completed ? new Date(now).toISOString() : null,
      referral_code: user.referral_code ?? generateReferralCode(email),
    }
  );
  if (!row) throw new Error("Could not save onboarding.");
}

export async function saveSupabaseUserPreferences(
  email: string,
  preferences: UserPreferences
): Promise<void> {
  const user = await ensureSupabaseUser(email);
  const [row] = await requireSupabaseClient().update(
    "users",
    new URLSearchParams({ id: eq(user.id) }),
    { user_preferences: preferences }
  );
  if (!row) throw new Error("Could not save preferences.");
}

export async function saveSupabaseUserRole(
  email: string,
  role: UserRoleId
): Promise<void> {
  const user = await ensureSupabaseUser(email);
  const existing = parseJsonField<OnboardingState>(user.onboarding_state, DEFAULT_ONBOARDING);
  const [row] = await requireSupabaseClient().update(
    "users",
    new URLSearchParams({ id: eq(user.id) }),
    {
      user_role: role,
      onboarding_state: { ...existing, role },
    }
  );
  if (!row) throw new Error("Could not update role.");
}

export async function recordSupabaseDailyActivity(email: string): Promise<number> {
  const user = await ensureSupabaseUser(email);
  const today = todayKey();
  const last = user.last_active_date_key;
  let streak = user.learning_streak_days ?? 0;

  if (last === today) return streak;

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (last === yesterday) streak += 1;
  else streak = 1;

  await requireSupabaseClient().update(
    "users",
    new URLSearchParams({ id: eq(user.id) }),
    {
      learning_streak_days: streak,
      last_active_date_key: today,
    }
  );
  return streak;
}

