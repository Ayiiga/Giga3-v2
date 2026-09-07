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
  { id: "why-misinformation-spreads", label: "Why false content spreads" },
  { id: "types", label: "Types of misleading content" },
  { id: "checklist", label: "Six-step verification checklist" },
  { id: "ai-content", label: "AI-generated and deepfake media" },
  { id: "responsible-sharing", label: "Share responsibly" },
] as const;

export const PLAIN_TEXT = `
Digital literacy Ghana Facebook TikTok WhatsApp misinformation disinformation deepfakes fake screenshots.
Verification checklist who published original source when credible reporting image video authentic AI altered.
Responsible sharing fact-checking social media Ghana AI generated content.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        A shocking headline hits your WhatsApp group. A TikTok clip claims a celebrity died. Facebook
        shows a screenshot of &quot;breaking news&quot; with no link. Should you forward it?{" "}
        <strong>Not until you verify.</strong> This digital literacy guide helps Ghanaian users spot
        misinformation and share responsibly.
      </Prose>

      <ArticleH2 id="why-misinformation-spreads">Why false content spreads</ArticleH2>
      <Prose>
        Social platforms reward speed and emotion. Misinformation ( innocent sharing of false info)
        and disinformation ( deliberate deception) both travel faster than corrections — especially
        during elections, exam seasons, and economic debates.
      </Prose>

      <ArticleH2 id="types">Types of misleading content</ArticleH2>
      <BulletList
        items={[
          "Misleading headlines that do not match the linked article.",
          "Out-of-context photos from old events presented as 'breaking'.",
          "Fake screenshots of news sites or bank alerts.",
          "Impersonation accounts mimicking journalists or officials.",
          "Manipulated images and AI-generated deepfake videos.",
          "Chain messages on WhatsApp with no verifiable source.",
        ]}
      />

      <ArticleH2 id="checklist">Six-step verification checklist</ArticleH2>
      <Prose>Before you share, ask:</Prose>
      <BulletList
        items={[
          "1. Who published it? Is the account official and long-established?",
          "2. What is the original source? Trace back to a primary outlet or document.",
          "3. When was it published? Old stories often resurface as 'new'.",
          "4. Is another credible source reporting the same thing independently?",
          "5. Is the image or video actually from the claimed event? Reverse-image search helps.",
          "6. Could AI or editing have altered it? Look for odd hands, lip sync, or unnatural lighting.",
        ]}
      />

      <ArticleH2 id="ai-content">AI-generated and deepfake media</ArticleH2>
      <Prose>
        AI can create realistic voices, faces, and documents. That makes{" "}
        <ArticleLink href="/blog/ghana-ai-future-opportunities-challenges/">
          Ghana&apos;s AI future
        </ArticleLink>{" "}
        exciting for creativity — and dangerous for fraud. Treat sensational AI clips like any other
        claim: verify with official statements from WAEC, Bank of Ghana, or recognised newsrooms — not
        anonymous forwards.
      </Prose>

      <ArticleH2 id="responsible-sharing">Share responsibly</ArticleH2>
      <Prose>
        If you are unsure, do not forward. Correct friends privately when you find errors. Teach
        family members the checklist above — especially during WASSCE results season when fake
        &quot;upgrade&quot; scams appear. Pair media literacy with{" "}
        <ArticleLink href="/blog/ai-money-making-opportunities-ghana/">
          realistic online income advice
        </ArticleLink>{" "}
        so young people spot scams early.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/ai-money-making-opportunities-ghana/", label: "AI income opportunities & scams" },
          { href: "/blog/wassce-2026-results-ghana/", label: "WASSCE 2026 results — verify official sources" },
          { href: "/blog/ghana-wage-system-ghc-60000-vs-ghc-21-77/", label: "Ghana wage debate — facts vs reports" },
          { href: "/legal/acceptable-use/", label: "Giga3 Acceptable Use Policy" },
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
          title="Learn AI responsibly with Giga3"
          description="Understand what AI can and cannot do — essential for digital literacy in 2026."
          href="/ai-for-ghana/"
          label="AI for Ghana"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const FacebookTiktokWhatsappFactCheckingBody = { Body, plainText: PLAIN_TEXT };
