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
  { id: "tutoring", label: "1. AI tutoring" },
  { id: "research", label: "2. Research helpers" },
  { id: "writing", label: "3. Writing assistance" },
  { id: "mathematics", label: "4. Mathematics" },
  { id: "language", label: "5. Language learning" },
  { id: "notes", label: "6. Note-taking" },
  { id: "presentations", label: "7. Presentations" },
  { id: "images", label: "8. Image creation" },
  { id: "planning", label: "9. Study planning" },
  { id: "revision", label: "10. Revision tools" },
  { id: "integrity", label: "Responsible use" },
] as const;

export const PLAIN_TEXT = `
Ten AI tool categories Ghanaian students tutoring research writing maths language notes presentations images planning revision.
Giga3 AI GigaLearn ChatGPT Gemini Perplexity academic integrity verify teachers.
Responsible AI use disclose assistance no plagiarism mobile data Ghana networks.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghanaian students in SHS, university, and professional courses increasingly use AI — but not
        all tools serve study equally. This guide covers <strong>ten practical categories</strong>{" "}
        worth knowing in 2026, with tips for responsible use and academic integrity.
      </Prose>

      <ArticleH2 id="tutoring">1. AI tutoring</ArticleH2>
      <Prose>
        Chat-based tutors explain concepts step by step. <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink>{" "}
        and <ArticleLink href="/chat/login/">Giga3 AI Chat</ArticleLink> are African-context options
        with Paystack billing in cedis. International apps like ChatGPT and Gemini also work — test
        what performs best on your network.
      </Prose>

      <ArticleH2 id="research">2. Research helpers</ArticleH2>
      <Prose>
        Tools such as Perplexity and research modes in major chat apps summarise topics and suggest
        sources. Always click through to original papers and news sites — AI summaries are starting
        points, not citations.
      </Prose>

      <ArticleH2 id="writing">3. Writing assistance</ArticleH2>
      <Prose>
        AI can outline essays, improve grammar, and suggest clearer phrasing. Do not submit
        AI-generated essays as your own work unless your institution allows disclosed assistance.
      </Prose>

      <ArticleH2 id="mathematics">4. Mathematics</ArticleH2>
      <Prose>
        Ask for worked examples, then solve similar problems without looking. Useful for BECE, WASSCE,
        and university maths — see{" "}
        <ArticleLink href="/blog/ai-for-bece-wassce-preparation-ghana/">
          AI for BECE &amp; WASSCE prep
        </ArticleLink>.
      </Prose>

      <ArticleH2 id="language">5. Language learning</ArticleH2>
      <Prose>
        Practice English conversation, translation, and vocabulary drills. AI complements — but does
        not replace — classroom instruction and reading widely.
      </Prose>

      <ArticleH2 id="notes">6. Note-taking</ArticleH2>
      <Prose>
        Summarise lecture recordings or long PDFs into structured notes. Rewrite summaries in your
        own words to improve retention.
      </Prose>

      <ArticleH2 id="presentations">7. Presentations</ArticleH2>
      <Prose>
        Draft slide outlines and speaker notes quickly. Verify facts on every slide before presenting
        to your class.
      </Prose>

      <ArticleH2 id="images">8. Image creation</ArticleH2>
      <Prose>
        Generate diagrams and project visuals via <ArticleLink href="/media/">Media Studio</ArticleLink>{" "}
        or similar tools. Label AI-generated images when submitting coursework if required.
      </Prose>

      <ArticleH2 id="planning">9. Study planning</ArticleH2>
      <Prose>
        Build weekly timetables around weak subjects. Combine AI plans with your teacher&apos;s
        syllabus and mock exam dates.
      </Prose>

      <ArticleH2 id="revision">10. Revision tools</ArticleH2>
      <Prose>
        Generate flashcards, quizzes, and past-question-style drills. Pair with{" "}
        <ArticleLink href="/blog/wassce-ai-study-guide/">WASSCE + AI</ArticleLink> for exam-season
        habits.
      </Prose>

      <ArticleH2 id="integrity">Responsible use</ArticleH2>
      <BulletList
        items={[
          "Verify facts — AI can hallucinate confidently.",
          "Disclose AI help when your school requires it.",
          "Never upload confidential exam papers or personal ID unnecessarily.",
          "Use AI to learn, not to skip learning.",
          "Read Giga3's AI Usage Policy at /legal/ai-usage/.",
        ]}
      />

      <RelatedReading
        links={[
          { href: "/blog/wassce-ai-study-guide/", label: "WASSCE + AI study guide" },
          { href: "/blog/best-ai-tools-in-ghana-2026/", label: "Best AI tools in Ghana" },
          { href: "/ai-tools-for-students-ghana/", label: "AI tools for students hub" },
          { href: "/gigalearn/", label: "GigaLearn" },
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
          title="Try Giga3 AI for studying"
          description="Chat, GigaLearn, and media tools — starter credits and Paystack billing in Ghana cedis."
          href="/chat/login/"
          label="Start free"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AiToolsForGhanaianStudents2026Body = { Body, plainText: PLAIN_TEXT };
