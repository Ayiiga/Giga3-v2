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
  { id: "landscape", label: "Ghana's AI landscape" },
  { id: "education", label: "AI in education" },
  { id: "sectors", label: "Opportunities by sector" },
  { id: "risks", label: "Risks and challenges" },
  { id: "recommendations", label: "Practical recommendations" },
] as const;

export const PLAIN_TEXT = `
Ghana AI future education entrepreneurship jobs government businesses schools agriculture healthcare finance creativity digital inclusion.
Opportunities challenges young people students teachers entrepreneurs risks recommendations Giga3 AI Ghana Africa.
One Million Coders national AI strategy digital transformation.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghana stands at an AI crossroads. From SHS classrooms preparing for WASSCE to startups
        building fintech tools, artificial intelligence is moving from novelty to infrastructure.
        Young people need a clear-eyed view of <strong>opportunities, risks, and practical next
        steps</strong> — not hype.
      </Prose>

      <ArticleH2 id="landscape">Ghana&apos;s AI landscape</ArticleH2>
      <Prose>
        Government programmes such as{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-tech-future/">
          One Million Coders
        </ArticleLink>{" "}
        aim to expand digital skills nationwide. Ministries and universities — including work with
        the KNUST Responsible AI Lab — are developing a national AI strategy. Private platforms like{" "}
        <ArticleLink href="/ai-for-ghana/">Giga3 AI</ArticleLink> bring chat, media, and learning
        tools to everyday users with local billing.
      </Prose>

      <ArticleH2 id="education">AI in education</ArticleH2>
      <Prose>
        Teachers can save prep time with AI drafts — always reviewed for accuracy. Students can use
        AI for explanation and practice — not cheating. Read our guides for{" "}
        <ArticleLink href="/blog/ai-for-ghanaian-teachers/">teachers</ArticleLink> and{" "}
        <ArticleLink href="/blog/wassce-ai-study-guide/">WASSCE students</ArticleLink>.{" "}
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> supports structured learning paths.
      </Prose>

      <ArticleH2 id="sectors">Opportunities by sector</ArticleH2>
      <ArticleH3>Jobs and entrepreneurship</ArticleH3>
      <Prose>
        AI lowers barriers for content creators, freelancers, and SME support services — see{" "}
        <ArticleLink href="/blog/ai-money-making-opportunities-ghana/">
          the new Ghanaian hustle
        </ArticleLink>.
      </Prose>
      <ArticleH3>Agriculture, healthcare, and finance</ArticleH3>
      <Prose>
        AI can assist crop advisory, diagnostic support, and customer service — when paired with
        local data and human oversight. These sectors need Ghanaian datasets and ethical review, not
        imported demos alone.
      </Prose>
      <ArticleH3>Creativity and media</ArticleH3>
      <Prose>
        <ArticleLink href="/ai-studio/">AI Studio</ArticleLink>,{" "}
        <ArticleLink href="/media/">Media Studio</ArticleLink>, and{" "}
        <ArticleLink href="/video/">Video AI</ArticleLink> help creators produce faster — with clear
        labelling of AI-assisted work.
      </Prose>

      <ArticleH2 id="risks">Risks and challenges</ArticleH2>
      <BulletList
        items={[
          "Digital divide: rural and low-income users may lack devices and affordable data.",
          "Misinformation: AI makes fake content easier — literacy is essential.",
          "Job disruption: some tasks shrink; reskilling must keep pace.",
          "Data privacy: personal and financial data need strong protection.",
          "Over-hype: policy targets without delivery capacity erode public trust.",
        ]}
      />
      <Prose>
        Learn verification habits in our{" "}
        <ArticleLink href="/blog/facebook-tiktok-whatsapp-fact-checking/">
          social media fact-checking guide
        </ArticleLink>.
      </Prose>

      <ArticleH2 id="recommendations">Practical recommendations</ArticleH2>
      <ArticleH3>For students</ArticleH3>
      <BulletList
        items={[
          "Use AI to learn, verify, and practise — not to skip assignments.",
          "Explore formal digital skills programmes alongside school.",
        ]}
      />
      <ArticleH3>For teachers</ArticleH3>
      <BulletList
        items={[
          "Adopt AI for planning and differentiation; review every output.",
          "Teach students integrity and fact-checking early.",
        ]}
      />
      <ArticleH3>For entrepreneurs and businesses</ArticleH3>
      <BulletList
        items={[
          "Start with one workflow — customer replies, content, or reporting.",
          "Disclose AI use to customers where trust requires it.",
          "Explore enterprise options at /enterprise/ for volume needs.",
        ]}
      />
      <Prose>
        Ghana&apos;s AI future is not predetermined. It will be shaped by informed citizens, capable
        educators, honest businesses, and transparent government. Start where you are — with one
        tool, one project, one verified fact at a time.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/african-youth-ai-future-jobs/", label: "African youth and AI jobs" },
          { href: "/blog/one-million-coders-ghana-tech-future/", label: "One Million Coders" },
          { href: "/blog/best-ai-tools-in-ghana-2026/", label: "Best AI tools in Ghana" },
          { href: "/ai-for-ghana/", label: "AI for Ghana" },
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
          title="Explore Giga3 AI for Ghana"
          description="Chat, media, learning, and creator tools — one platform with Paystack billing in cedis."
          href="/ai-for-ghana/"
          label="Discover AI for Ghana"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const GhanaAiFutureOpportunitiesChallengesBody = { Body, plainText: PLAIN_TEXT };
