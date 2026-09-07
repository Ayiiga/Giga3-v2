import {
  ArticleH2,
  ArticleH3,
  ArticleLink,
  BulletList,
  Prose,
  RelatedReading,
} from "@/components/seo/SeoArticleParts";
import { BlogArticleLayout } from "@/components/blog/BlogHeader";
import { BlogProductCta } from "@/components/blog/BlogTableOfContents";
import type { BlogArticleBodyProps } from "@/lib/blog/posts";

const TOC = [
  { id: "realistic-expectations", label: "Realistic expectations" },
  { id: "content-creation", label: "Content and social media" },
  { id: "design-video", label: "Design and video" },
  { id: "writing-tutoring", label: "Writing and tutoring" },
  { id: "freelancing", label: "Freelancing and local services" },
  { id: "scam-warnings", label: "Scams to avoid" },
  { id: "getting-started", label: "Getting started safely" },
] as const;

export const PLAIN_TEXT = `
Ghanaian youth AI money online content creation graphic design video editing social media copywriting tutoring freelancing.
No guaranteed income legitimate opportunities scams fake investment fake AI jobs advance fee crypto get rich quick.
Creator Studio Media Studio GigaSocial responsible earning Ghana.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Young Ghanaians are exploring a <strong>new hustle</strong>: using AI to offer services
        online — from TikTok scripts to logo drafts and tutoring. Income is possible, but{" "}
        <strong>nothing is guaranteed</strong>. This guide separates realistic opportunities from
        scams flooding WhatsApp and Facebook.
      </Prose>

      <ArticleH2 id="realistic-expectations">Realistic expectations</ArticleH2>
      <Prose>
        AI lowers the skill floor — you can draft faster — but clients still pay for reliability,
        taste, and delivery. Most earners combine AI with human judgment, portfolios, and repeat
        customers. Treat early months as learning, not instant profit.
      </Prose>

      <ArticleH2 id="content-creation">Content and social media</ArticleH2>
      <Prose>
        Draft scripts, captions, and content calendars for local brands and creators. Tools like{" "}
        <ArticleLink href="/creator-studio/">Creator Studio</ArticleLink> and{" "}
        <ArticleLink href="/gigasocial/">GigaSocial</ArticleLink> support publishing workflows.
        Charge per package (e.g., weekly posts + revisions), not vague promises of virality.
      </Prose>

      <ArticleH2 id="design-video">Design and video</ArticleH2>
      <Prose>
        AI assists with image concepts via <ArticleLink href="/media/">Media Studio</ArticleLink>,
        short clips via <ArticleLink href="/video/">Video AI</ArticleLink>, and edits via{" "}
        <ArticleLink href="/gigaedit/">GigaEdit</ArticleLink>. Deliver finished files clients can
        use — AI drafts alone are rarely enough.
      </Prose>

      <ArticleH2 id="writing-tutoring">Writing and tutoring</ArticleH2>
      <Prose>
        Offer copywriting for SMEs, CV reviews, or subject tutoring online. AI helps you prepare
        materials; your teaching quality wins referrals. Never complete graded assignments for
        students — that is academic dishonesty and reputational risk.
      </Prose>

      <ArticleH2 id="freelancing">Freelancing and local services</ArticleH2>
      <BulletList
        items={[
          "Website and landing-page copy for Ghanaian shops moving online.",
          "WhatsApp business catalog descriptions and product photos.",
          "Digital products: templates, study guides, or niche ebooks (with original value).",
          "International platforms: competitive — build a portfolio first on local clients.",
        ]}
      />

      <ArticleH2 id="scam-warnings">Scams to avoid</ArticleH2>
      <BulletList
        items={[
          "Fake investment schemes promising daily returns — if it sounds guaranteed, walk away.",
          "Fake 'AI job' listings asking for registration fees upfront.",
          "Advance-fee scams: pay to unlock earnings that never arrive.",
          "Account theft: never share Mobile Money PINs or OTP codes.",
          "Fake crypto 'doubling' pages promoted on Telegram and TikTok.",
          "Misleading get-rich-quick courses with no verifiable graduates.",
        ]}
      />
      <Prose>
        Read our guide on{" "}
        <ArticleLink href="/blog/facebook-tiktok-whatsapp-fact-checking/">
          verifying social media claims
        </ArticleLink>{" "}
        before you trust income screenshots.
      </Prose>

      <ArticleH2 id="getting-started">Getting started safely</ArticleH2>
      <Prose>
        Pick one service, create three sample pieces, ask for honest feedback, then charge fairly.
        Use <ArticleLink href="/chat/login/">Giga3 AI</ArticleLink> to draft proposals and{" "}
        <ArticleLink href="/pricing/">check pricing</ArticleLink> for tool costs. Explore{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-tech-future/">
          One Million Coders
        </ArticleLink>{" "}
        for formal digital skills alongside your hustle.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/facebook-tiktok-whatsapp-fact-checking/", label: "Verify before you share" },
          { href: "/blog/best-ai-tools-in-ghana-2026/", label: "Best AI tools in Ghana" },
          { href: "/creator-studio/", label: "Creator Studio" },
          { href: "/media/", label: "Media Studio" },
        ]}
      />
    </>
  );
}

function Body({ post }: BlogArticleBodyProps) {
  return (
    <BlogArticleLayout
      post={post}
      toc={TOC}
      cta={
        <BlogProductCta
          title="Create and publish with Giga3 AI"
          description="Media Studio, Video AI, and Creator Studio — build a portfolio before you pitch clients."
          href="/creator-studio/"
          label="Open Creator Studio"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AiMoneyMakingOpportunitiesGhanaBody = { Body, plainText: PLAIN_TEXT };
