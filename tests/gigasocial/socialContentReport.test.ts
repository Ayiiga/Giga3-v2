import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SOCIAL_CONTENT_REPORT_REASONS,
  SOCIAL_REPORT_RATE_LIMIT_MAX,
  countReportsInWindow,
  isDuplicateSocialReport,
  isSelfReport,
  isSocialReportRateLimited,
  normalizeSocialReportReason,
  socialReportTargetKey,
} from "../../convex/socialContentReportPolicy";
import {
  SOCIAL_CONTENT_REPORT_OPTIONS,
  SOCIAL_REPORT_ALREADY_MESSAGE,
  SOCIAL_REPORT_SUCCESS_MESSAGE,
} from "../../web/lib/gigasocial/socialContentReport";

const root = resolve(__dirname, "../..");

describe("socialContentReportPolicy", () => {
  it("accepts known reasons including copyright and impersonation", () => {
    expect(normalizeSocialReportReason("Spam")).toBe("spam");
    expect(normalizeSocialReportReason("copyright")).toBe("copyright");
    expect(normalizeSocialReportReason("impersonation")).toBe("impersonation");
    expect(normalizeSocialReportReason("not-a-reason")).toBeNull();
    expect(SOCIAL_CONTENT_REPORT_REASONS).toContain("child_safety");
  });

  it("builds stable target keys", () => {
    expect(
      socialReportTargetKey({ targetType: "post", postId: "p1" })
    ).toBe("post:p1");
    expect(
      socialReportTargetKey({
        targetType: "profile",
        profileUserId: "User@Example.com",
      })
    ).toBe("profile:user@example.com");
    expect(socialReportTargetKey({ targetType: "comment" })).toBeNull();
  });

  it("detects self-reports", () => {
    expect(
      isSelfReport({
        reporterId: "a@x.com",
        targetAuthorId: "A@x.com",
      })
    ).toBe(true);
    expect(
      isSelfReport({
        reporterId: "a@x.com",
        targetAuthorId: "b@x.com",
      })
    ).toBe(false);
  });

  it("dedupes open reports for the same target and reason within 24h", () => {
    const nowMs = 1_700_000_000_000;
    expect(
      isDuplicateSocialReport(
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          status: "open",
          createdAt: nowMs - 60_000,
        },
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          nowMs,
        }
      )
    ).toBe(true);
    expect(
      isDuplicateSocialReport(
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          status: "dismissed",
          createdAt: nowMs - 60_000,
        },
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          nowMs,
        }
      )
    ).toBe(false);
    expect(
      isDuplicateSocialReport(
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          status: "open",
          createdAt: nowMs - 25 * 60 * 60 * 1000,
        },
        {
          targetType: "post",
          postId: "p1",
          reason: "spam",
          nowMs,
        }
      )
    ).toBe(false);
  });

  it("enforces the rolling report rate limit", () => {
    const nowMs = 1_700_000_000_000;
    const recent = Array.from({ length: SOCIAL_REPORT_RATE_LIMIT_MAX }, (_, i) => ({
      createdAt: nowMs - i * 1000,
    }));
    expect(countReportsInWindow(recent, nowMs)).toBe(SOCIAL_REPORT_RATE_LIMIT_MAX);
    expect(isSocialReportRateLimited(countReportsInWindow(recent, nowMs))).toBe(
      true
    );
    expect(
      isSocialReportRateLimited(
        countReportsInWindow([{ createdAt: nowMs - 2 * 60 * 60 * 1000 }], nowMs)
      )
    ).toBe(false);
  });
});

describe("social content report wiring", () => {
  it("hardens reportSocialContent with session ctx, dedupe, and rate limit", () => {
    const social = readFileSync(resolve(root, "convex/gigaSocial.ts"), "utf8");
    expect(social).toContain("reportSocialContent");
    expect(social).toContain("requireSession(args.sessionToken, ctx)");
    expect(social).toContain("isDuplicateSocialReport");
    expect(social).toContain("isSocialReportRateLimited");
    expect(social).toContain("You cannot report your own content.");
    expect(social).toContain("alreadyReported");
    expect(social).not.toMatch(
      /reportSocialContent[\s\S]{0,800}deletedAt:\s*Date\.now\(\)/
    );
  });

  it("exposes report UI on posts, comments, and profiles", () => {
    const postCard = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialPostCard.tsx"),
      "utf8"
    );
    const comments = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialCommentThread.tsx"),
      "utf8"
    );
    const profile = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialPublicProfileClient.tsx"),
      "utf8"
    );
    const dialog = readFileSync(
      resolve(
        root,
        "web/components/gigasocial/trust/GigaSocialReportDialog.tsx"
      ),
      "utf8"
    );

    expect(postCard).toContain("GigaSocialReportDialog");
    expect(postCard).toContain('targetType: "post"');
    expect(comments).toContain('targetType: "comment"');
    expect(profile).toContain('targetType: "profile"');
    expect(dialog).toContain("reportSocialContent");
    expect(dialog).toContain("Submit report");
    expect(SOCIAL_CONTENT_REPORT_OPTIONS.map((o) => o.id)).toEqual(
      expect.arrayContaining(["copyright", "impersonation", "child_safety"])
    );
    expect(SOCIAL_REPORT_SUCCESS_MESSAGE).toMatch(/not removed automatically/i);
    expect(SOCIAL_REPORT_ALREADY_MESSAGE).toMatch(/already reported/i);
  });

  it("wraps public profile Convex hooks inside ConvexAppShell (static-export safe)", () => {
    // Regression: useQuery above ConvexAppShell crashes /gigasocial/profile/[handle]/.
    const profile = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialPublicProfileClient.tsx"),
      "utf8"
    );
    const post = readFileSync(
      resolve(root, "web/components/gigasocial/GigaSocialPublicPostClient.tsx"),
      "utf8"
    );
    expect(profile).toMatch(
      /export function GigaSocialPublicProfileRoot\(\) \{\s*return \(\s*<ConvexAppShell>/
    );
    const innerStart = profile.indexOf("function PublicProfileInner");
    expect(innerStart).toBeGreaterThan(0);
    const hookInInner = profile.indexOf(
      "useQuery(\n    api.gigaSocial.getMyProfile",
      innerStart
    );
    expect(hookInInner).toBeGreaterThan(innerStart);
    // Keep post detail on the same provider pattern.
    expect(post).toMatch(
      /export function GigaSocialPublicPostRoot[\s\S]*?<ConvexAppShell>/
    );
  });

  it("keeps Android video duration fix from PR #602 intact", () => {
    const duration = readFileSync(
      resolve(root, "web/lib/gigasocial/videoDuration.ts"),
      "utf8"
    );
    expect(duration).toContain("readSocialVideoDuration");
    expect(duration).toContain("playsInline");
    expect(duration).toContain("AbortSignal");
  });
});
