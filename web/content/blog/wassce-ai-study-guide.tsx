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
  { id: "how-ai-helps", label: "How AI helps WASSCE study" },
  { id: "practice", label: "Practice questions and quizzes" },
  { id: "subjects", label: "Subject-by-subject support" },
  { id: "revision-plans", label: "Revision plans and flashcards" },
  { id: "risks", label: "Hallucinations and overdependence" },
  { id: "integrity", label: "Cheating and academic integrity" },
  { id: "supervision", label: "Teacher and parent supervision" },
] as const;

export const PLAIN_TEXT = `
WASSCE AI study guide Ghanaian students personalised explanations practice questions revision plans flashcards quizzes.
Mathematics English science support exam preparation hallucinations cheating overdependence privacy fact-checking.
Teacher supervision learning assistant not replacement GigaLearn responsible AI use Ghana.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Can artificial intelligence help Ghanaian students study better for WASSCE?{" "}
        <strong>Yes — when used as a learning assistant, not a shortcut.</strong> AI can personalise
        explanations, generate practice, and organise revision. It cannot sit the exam for you, and
        it will sometimes be wrong.
      </Prose>

      <ArticleH2 id="how-ai-helps">How AI helps WASSCE study</ArticleH2>
      <Prose>
        The best pattern is <em>ask → attempt → verify</em>. Ask AI to explain a topic or create a
        question. Attempt it on paper without help. Verify using textbooks, marking schemes, and
        teachers. Repeat daily.
      </Prose>

      <ArticleH2 id="practice">Practice questions and quizzes</ArticleH2>
      <Prose>
        Request WASSCE-style questions for Core Mathematics, Integrated Science, English Language,
        Social Studies, and your electives. Specify difficulty and time limits to simulate exam
        conditions.
      </Prose>

      <ArticleH2 id="subjects">Subject-by-subject support</ArticleH2>
      <ArticleH3>Mathematics</ArticleH3>
      <Prose>
        Ask for step-by-step methods, then solve similar problems independently. Show working — exam
        markers reward process, not just final answers.
      </Prose>
      <ArticleH3>English &amp; phonics</ArticleH3>
      <Prose>
        Practice comprehension, essay structure, and vocabulary. Use AI to suggest outlines, then
        write the full essay yourself.
      </Prose>
      <ArticleH3>Science</ArticleH3>
      <Prose>
        Clarify definitions, experiments, and diagrams. Cross-check scientific claims — AI sometimes
        mixes up units or misstates Ghana-specific examples.
      </Prose>

      <ArticleH2 id="revision-plans">Revision plans and flashcards</ArticleH2>
      <Prose>
        Build weekly schedules around mock results. Generate flashcards, then rewrite them in your
        own words. <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> supports structured
        explanations when you need more than one-off chat replies.
      </Prose>

      <ArticleH2 id="risks">Hallucinations and overdependence</ArticleH2>
      <BulletList
        items={[
          "Hallucinations: AI may invent facts, formulas, or citations — always verify.",
          "Overdependence: If you cannot solve problems without AI, you are not exam-ready.",
          "Privacy: Avoid uploading personal ID or confidential school documents.",
        ]}
      />

      <ArticleH2 id="integrity">Cheating and academic integrity</ArticleH2>
      <Prose>
        Copying AI essays into coursework or attempting to use phones in exams is cheating — with
        serious consequences, including result cancellation. WAEC actively investigates
        irregularities. Use AI to <em>learn</em>, not to bypass rules. Read{" "}
        <ArticleLink href="/legal/ai-usage/">Giga3&apos;s AI Usage Policy</ArticleLink>.
      </Prose>

      <ArticleH2 id="supervision">Teacher and parent supervision</ArticleH2>
      <Prose>
        Teachers and parents should know when students use AI, set boundaries, and encourage
        verification habits. After results release, see{" "}
        <ArticleLink href="/blog/wassce-2026-results-ghana/">
          WASSCE 2026 results guidance
        </ArticleLink>{" "}
        and{" "}
        <ArticleLink href="/blog/ai-tools-for-ghanaian-students-2026/">
          AI tools for students
        </ArticleLink>.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/wassce-2026-results-ghana/", label: "WASSCE 2026 results guide" },
          { href: "/blog/ai-for-bece-wassce-preparation-ghana/", label: "AI for BECE & WASSCE prep" },
          { href: "/blog/ai-tools-for-ghanaian-students-2026/", label: "10 AI tools for students" },
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
          title="Study smarter with GigaLearn"
          description="Structured WASSCE revision support — explanations, practice, and responsible AI habits."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const WassceAiStudyGuideBody = { Body, plainText: PLAIN_TEXT };
