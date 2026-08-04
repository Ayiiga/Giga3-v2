"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  getConvexSiteUrl,
  getFrontendBaseUrl,
  isEmailDeliveryConfigured,
  sendEmail,
  wrapEmailHtml,
} from "./emailClient";

type Candidate = {
  email: string;
  name?: string;
  topics: string[];
  inactiveDays: number;
  streakDays: number;
  unsubscribeToken: string;
  role: string;
};

function pickTheme(candidate: Candidate): {
  title: string;
  lead: string;
  ctaLabel: string;
  ctaPath: string;
  bullets: string[];
} {
  const topics = candidate.topics.map((t) => t.toLowerCase());
  const role = candidate.role.toLowerCase();
  const joined = `${topics.join(" ")} ${role}`;

  if (/learn|study|exam|school|education|teacher|student/.test(joined)) {
    return {
      title: "Your next learning streak is waiting",
      lead: "GigaLearn and chat can turn a short session into clear notes, quizzes, and explanations.",
      ctaLabel: "Continue learning",
      ctaPath: "/gigalearn/",
      bullets: [
        "Ask for a lesson summary or practice questions",
        "Save strong answers into your workspace",
        "Come back tomorrow to keep your streak alive",
      ],
    };
  }

  if (/creat|design|image|video|edit|media|art/.test(joined)) {
    return {
      title: "Make something new in minutes",
      lead: "Media Studio and GigaEdit are ready for your next poster, clip, or social Story.",
      ctaLabel: "Start creating",
      ctaPath: "/gigaedit/",
      bullets: [
        "Generate or refine an image for your brand",
        "Edit and export with GigaEdit",
        "Post a photo or video Story on GigaSocial",
      ],
    };
  }

  if (/fun|entertain|music|story|social|game/.test(joined)) {
    return {
      title: "Come back for entertainment & community",
      lead: "GigaSocial Stories now support photos and videos — share a quick update with your ring.",
      ctaLabel: "Open GigaSocial",
      ctaPath: "/gigasocial/",
      bullets: [
        "Watch Stories from creators you follow",
        "Share a photo or short video Story",
        "Tip, comment, and grow with the community",
      ],
    };
  }

  return {
    title: "We saved a spot for your next idea",
    lead: "Whether you want to create, learn, or just explore — Giga3 AI is ready when you are.",
    ctaLabel: "Open Giga3",
    ctaPath: "/chat/",
    bullets: [
      "Chat for ideas, plans, and quick answers",
      "Create with Media Studio, GigaEdit, and Stories",
      "Learn with GigaLearn or browse the marketplace",
    ],
  };
}

function buildEngagementHtml(candidate: Candidate): {
  subject: string;
  html: string;
  text: string;
} {
  const frontend = getFrontendBaseUrl();
  const theme = pickTheme(candidate);
  const greet = candidate.name?.trim()
    ? `Hi ${candidate.name.trim().split(/\s+/)[0]},`
    : "Hi there,";
  const memory =
    candidate.topics.length > 0
      ? `Lately you have been exploring <strong>${candidate.topics
          .slice(0, 3)
          .join(", ")}</strong>.`
      : "Your workspace still has room for a fresh idea today.";
  const streak =
    candidate.streakDays > 0
      ? `Your learning streak is at <strong>${candidate.streakDays}</strong> day${
          candidate.streakDays === 1 ? "" : "s"
        }.`
      : "A short session today can start a new streak.";
  const unsub = `${getConvexSiteUrl()}/email/unsubscribe?email=${encodeURIComponent(
    candidate.email
  )}&token=${encodeURIComponent(candidate.unsubscribeToken)}`;
  const ctaUrl = `${frontend}${theme.ctaPath}`;

  const html = wrapEmailHtml({
    title: theme.title,
    bodyHtml: `
      <p style="margin:0 0 12px;">${greet}</p>
      <p style="margin:0 0 12px;">${theme.lead}</p>
      <p style="margin:0 0 12px;">${memory} ${streak}</p>
      <ul style="margin:0 0 20px;padding-left:18px;">
        ${theme.bullets.map((b) => `<li style="margin:0 0 6px;">${b}</li>`).join("")}
      </ul>
      <p style="margin:0 0 8px;">
        <a href="${ctaUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          ${theme.ctaLabel}
        </a>
      </p>
    `,
    footerHtml: `
      <p style="margin:0;">You are getting occasional Giga3 updates because you have an account.</p>
      <p style="margin:8px 0 0;"><a href="${unsub}" style="color:#0f766e;">Unsubscribe from these emails</a></p>
    `,
  });

  const text = [
    greet.replace(/,$/, ""),
    theme.lead,
    candidate.topics.length
      ? `Topics you explored: ${candidate.topics.slice(0, 3).join(", ")}`
      : "",
    `${theme.ctaLabel}: ${ctaUrl}`,
    `Unsubscribe: ${unsub}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject: `${theme.title} · Giga3 AI`,
    html,
    text,
  };
}

/**
 * Occasional re-engagement digests for inactive opted-in users.
 * Scheduled from crons.ts (every few days).
 */
export const sendEngagementDigests = internalAction({
  args: {
    limit: v.optional(v.number()),
    minInactiveDays: v.optional(v.number()),
    minDaysSinceLastEmail: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!isEmailDeliveryConfigured()) {
      console.error("[engagementEmail] skipped — RESEND_API_KEY not configured");
      return { ok: false as const, reason: "not_configured", sent: 0, attempted: 0 };
    }

    const candidates = await ctx.runQuery(
      internal.engagementEmail.listEngagementCandidatesInternal,
      {
        limit: args.limit,
        minInactiveDays: args.minInactiveDays,
        minDaysSinceLastEmail: args.minDaysSinceLastEmail,
      }
    );

    let sent = 0;
    let failed = 0;

    for (const candidate of candidates as Candidate[]) {
      const ensured = await ctx.runMutation(
        internal.engagementEmail.ensureUnsubscribeTokenInternal,
        {
          email: candidate.email,
          unsubscribeToken: candidate.unsubscribeToken,
        }
      );
      const ready = { ...candidate, unsubscribeToken: ensured.token };
      const content = buildEngagementHtml(ready);
      const result = await sendEmail({
        to: ready.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "category", value: "engagement" },
          { name: "app", value: "giga3" },
        ],
      });

      if (result.ok) {
        sent += 1;
        await ctx.runMutation(
          internal.engagementEmail.markEngagementEmailSentInternal,
          {
            email: ready.email,
            unsubscribeToken: ready.unsubscribeToken,
          }
        );
      } else {
        failed += 1;
      }
    }

    return {
      ok: true as const,
      attempted: candidates.length,
      sent,
      failed,
    };
  },
});
