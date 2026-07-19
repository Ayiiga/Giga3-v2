import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSession } from "./auth";
import { sessionArgs } from "./validators";
import { sanitizeSocialText, toPublicAuthor } from "./gigaSocialViews";
import {
  deductVariableCredits,
  isMonetizationUnlocked,
  loadEconomySettings,
} from "./gigaSocialEconomy";

const liveModeValidator = v.union(
  v.literal("video"),
  v.literal("audio"),
  v.literal("screen")
);

const liveStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("live"),
  v.literal("ended")
);

async function resolveAuthor(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  userId: string
) {
  try {
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return toPublicAuthor(profile, userId);
  } catch {
    return toPublicAuthor(null, userId);
  }
}

function parseReactionCounts(raw: string | undefined | null): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

/** Convex query results cannot use emoji/non-ASCII object keys — return an array instead. */
function reactionCountsToPublicArray(
  raw: string | undefined | null
): { emoji: string; count: number }[] {
  const counts = parseReactionCounts(raw);
  return Object.entries(counts).map(([emoji, count]) => ({
    emoji,
    count:
      typeof count === "number" && Number.isFinite(count)
        ? Math.max(0, Math.floor(count))
        : 0,
  }));
}

function parseCaptionLines(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
}

async function toPublicStream(
  ctx: { db: import("./_generated/server").QueryCtx["db"] },
  stream: {
    _id: Id<"socialLiveStreams">;
    hostId: string;
    title: string;
    mode: "video" | "audio" | "screen";
    status: "scheduled" | "live" | "ended";
    scheduledAt?: number;
    startedAt?: number;
    endedAt?: number;
    viewerCount: number;
    peakViewers: number;
    coHostIds?: string[];
    reactionCountsJson?: string;
    captionLinesJson?: string;
    replayUrl?: string;
    createdAt: number;
  }
) {
  const host = await resolveAuthor(ctx, stream.hostId);
  return {
    _id: stream._id,
    title: stream.title,
    mode: stream.mode,
    status: stream.status,
    scheduledAt: stream.scheduledAt,
    startedAt: stream.startedAt,
    endedAt: stream.endedAt,
    viewerCount: stream.viewerCount,
    peakViewers: stream.peakViewers,
    coHostIds: stream.coHostIds ?? [],
    reactionCounts: reactionCountsToPublicArray(stream.reactionCountsJson),
    captionLines: parseCaptionLines(stream.captionLinesJson),
    replayUrl: stream.replayUrl,
    createdAt: stream.createdAt,
    host,
  };
}

export const listLiveStreams = query({
  args: {
    status: v.optional(liveStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const cap = Math.min(Math.max(args.limit ?? 20, 1), 40);
      const status = args.status ?? "live";
      let rows: Doc<"socialLiveStreams">[] = [];

      try {
        rows = await ctx.db
          .query("socialLiveStreams")
          .withIndex("by_status_created", (q) => q.eq("status", status))
          .order("desc")
          .take(cap);
      } catch {
        const all = await ctx.db.query("socialLiveStreams").collect();
        rows = all
          .filter((row) => row.status === status)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, cap);
      }

      const streams = [];
      for (const row of rows) {
        try {
          streams.push(await toPublicStream(ctx, row));
        } catch {
          /* skip malformed row */
        }
      }
      return { streams };
    } catch {
      return { streams: [] };
    }
  },
});

export const getLiveStream = query({
  args: {
    streamId: v.id("socialLiveStreams"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const stream = await ctx.db.get(args.streamId);
    if (!stream) return null;
    const chat = await ctx.db
      .query("socialLiveChat")
      .withIndex("by_stream_created", (q) => q.eq("streamId", args.streamId))
      .order("asc")
      .take(120);
    const visibleChat = chat.filter((row) => !row.deletedAt);
    const messages = await Promise.all(
      visibleChat.map(async (row) => ({
        _id: row._id,
        body: row.body,
        createdAt: row.createdAt,
        author: await resolveAuthor(ctx, row.authorId),
      }))
    );
    const gifts = await ctx.db
      .query("socialLiveGifts")
      .withIndex("by_stream_created", (q) => q.eq("streamId", args.streamId))
      .order("desc")
      .take(30);
    const giftSenders = await Promise.all(
      gifts.map(async (gift) => ({
        giftType: gift.giftType,
        amount: gift.amount,
        createdAt: gift.createdAt,
        sender: await resolveAuthor(ctx, gift.senderId),
      }))
    );
    return {
      stream: await toPublicStream(ctx, stream),
      chat: messages,
      gifts: giftSenders,
    };
  },
});

export const scheduleLiveStream = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    mode: liveModeValidator,
    scheduledAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const title = sanitizeSocialText(args.title, 120);
    if (!title) throw new Error("Stream title is required.");
    const now = Date.now();
    if (args.scheduledAt < now - 60_000) {
      throw new Error("Schedule time must be in the future.");
    }
    const streamId = await ctx.db.insert("socialLiveStreams", {
      hostId: userId,
      title,
      mode: args.mode,
      status: "scheduled",
      scheduledAt: args.scheduledAt,
      viewerCount: 0,
      peakViewers: 0,
      coHostIds: [],
      mutedUserIds: [],
      reactionCountsJson: "{}",
      captionLinesJson: "[]",
      createdAt: now,
      updatedAt: now,
    });
    return { streamId };
  },
});

export const startLiveStream = mutation({
  args: {
    sessionToken: v.string(),
    title: v.optional(v.string()),
    mode: liveModeValidator,
    streamId: v.optional(v.id("socialLiveStreams")),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const now = Date.now();
    if (args.streamId) {
      const existing = await ctx.db.get(args.streamId);
      if (!existing || existing.hostId !== userId) {
        throw new Error("Stream not found.");
      }
      await ctx.db.patch(existing._id, {
        status: "live",
        startedAt: now,
        updatedAt: now,
      });
      return { streamId: existing._id };
    }
    const title = sanitizeSocialText(args.title ?? "GigaSocial Live", 120);
    const streamId = await ctx.db.insert("socialLiveStreams", {
      hostId: userId,
      title,
      mode: args.mode,
      status: "live",
      startedAt: now,
      viewerCount: 0,
      peakViewers: 0,
      coHostIds: [],
      mutedUserIds: [],
      reactionCountsJson: "{}",
      captionLinesJson: "[]",
      createdAt: now,
      updatedAt: now,
    });
    return { streamId };
  },
});

export const endLiveStream = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    replayUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.hostId !== userId) throw new Error("Stream not found.");
    const now = Date.now();
    await ctx.db.patch(stream._id, {
      status: "ended",
      endedAt: now,
      updatedAt: now,
      replayUrl: args.replayUrl?.trim().slice(0, 2000),
    });
    return { ok: true };
  },
});

export const joinLiveStream = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
  },
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.status !== "live") return { viewerCount: stream?.viewerCount ?? 0 };
    const next = stream.viewerCount + 1;
    await ctx.db.patch(stream._id, {
      viewerCount: next,
      peakViewers: Math.max(stream.peakViewers, next),
      updatedAt: Date.now(),
    });
    return { viewerCount: next };
  },
});

export const sendLiveChat = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.status !== "live") throw new Error("Stream is not live.");
    if (stream.mutedUserIds?.includes(userId)) throw new Error("You are muted in this stream.");
    const body = sanitizeSocialText(args.body, 500);
    if (!body) throw new Error("Message cannot be empty.");
    const isHostOrCoHost =
      stream.hostId === userId || stream.coHostIds?.includes(userId) === true;
    if (!isHostOrCoHost && body.length > 280) {
      throw new Error("Message is too long.");
    }
    await ctx.db.insert("socialLiveChat", {
      streamId: args.streamId,
      authorId: userId,
      body,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

export const sendLiveReaction = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.status !== "live") throw new Error("Stream is not live.");
    const emoji = args.emoji.trim().slice(0, 8);
    if (!emoji) throw new Error("Invalid reaction.");
    const counts = parseReactionCounts(stream.reactionCountsJson);
    counts[emoji] = (counts[emoji] ?? 0) + 1;
    await ctx.db.patch(stream._id, {
      reactionCountsJson: JSON.stringify(counts),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const sendLiveGift = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    giftType: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.status !== "live") throw new Error("Stream is not live.");
    if (userId === stream.hostId) throw new Error("You cannot gift yourself.");

    const hostProfile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_user", (q) => q.eq("userId", stream.hostId))
      .first();
    if (!hostProfile) throw new Error("Host profile not found.");

    const settings = await loadEconomySettings(ctx);
    const unlocked = await isMonetizationUnlocked(ctx, hostProfile, settings);
    if (!unlocked) {
      throw new Error("This creator has not unlocked live gifts yet (500 fans required).");
    }

    const giftType = args.giftType.trim().slice(0, 32);
    const credits = Math.max(1, Math.min(500, Math.floor(args.amount)));
    const share = settings.giftCreatorSharePercent / 100;
    const amountGhs = credits * settings.creditsToGhsRate * share;

    await deductVariableCredits(
      ctx,
      userId,
      credits,
      `live-gift:${stream.hostId}`,
      JSON.stringify({ giftType, credits, streamId: args.streamId })
    );

    await ctx.db.insert("socialLiveGifts", {
      streamId: args.streamId,
      senderId: userId,
      giftType,
      amount: credits,
      createdAt: Date.now(),
    });

    await ctx.db.insert("socialCreatorGifts", {
      creatorId: stream.hostId,
      senderId: userId,
      giftType,
      credits,
      amountGhs,
      streamId: args.streamId,
      createdAt: Date.now(),
    });

    return { ok: true, amountGhs };
  },
});

export const addLiveCaption = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    line: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.hostId !== userId) throw new Error("Only the host can add captions.");
    const line = sanitizeSocialText(args.line, 200);
    if (!line) return { ok: false };
    const lines = parseCaptionLines(stream.captionLinesJson);
    lines.push(line);
    await ctx.db.patch(stream._id, {
      captionLinesJson: JSON.stringify(lines.slice(-20)),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const addLiveCoHost = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    coHostHandle: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.hostId !== userId) throw new Error("Only the host can add co-hosts.");
    const handle = args.coHostHandle.trim().toLowerCase().replace(/^@/, "");
    const profile = await ctx.db
      .query("socialProfiles")
      .withIndex("by_handle", (q) => q.eq("handle", handle))
      .first();
    if (!profile) throw new Error("Creator not found.");
    const coHostIds = [...(stream.coHostIds ?? [])];
    if (!coHostIds.includes(profile.userId)) coHostIds.push(profile.userId);
    await ctx.db.patch(stream._id, { coHostIds, updatedAt: Date.now() });
    return { ok: true };
  },
});

export const moderateLiveChat = mutation({
  args: {
    sessionToken: v.string(),
    streamId: v.id("socialLiveStreams"),
    messageId: v.optional(v.id("socialLiveChat")),
    muteUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(args.sessionToken);
    const stream = await ctx.db.get(args.streamId);
    if (!stream || stream.hostId !== userId) throw new Error("Only the host can moderate.");
    if (args.messageId) {
      const message = await ctx.db.get(args.messageId);
      if (message && message.streamId === args.streamId) {
        await ctx.db.patch(message._id, { deletedAt: Date.now() });
      }
    }
    if (args.muteUserId) {
      const muted = [...(stream.mutedUserIds ?? [])];
      if (!muted.includes(args.muteUserId)) muted.push(args.muteUserId);
      await ctx.db.patch(stream._id, { mutedUserIds: muted, updatedAt: Date.now() });
    }
    return { ok: true };
  },
});

export const getMyLiveStreams = query({
  args: sessionArgs,
  handler: async (ctx, args) => {
    let userId: string;
    try {
      userId = await requireSession(args.sessionToken);
    } catch {
      return { streams: [] };
    }
    const rows = await ctx.db
      .query("socialLiveStreams")
      .withIndex("by_host_created", (q) => q.eq("hostId", userId))
      .order("desc")
      .take(20);
    const streams = [];
    for (const row of rows) {
      try {
        streams.push(await toPublicStream(ctx, row));
      } catch {
        /* skip malformed row */
      }
    }
    return { streams };
  },
});
