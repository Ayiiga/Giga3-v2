import {
  ArticleFigure,
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
  { id: "skills-not-apps", label: "Skills, not app logos" },
  { id: "prompting", label: "Clear prompting" },
  { id: "verification", label: "Verification & sources" },
  { id: "study-workflows", label: "Study workflows" },
  { id: "integrity", label: "Academic integrity" },
  { id: "data-privacy", label: "Data & privacy" },
  { id: "practice-plan", label: "Four-week practice plan" },
] as const;

export const PLAIN_TEXT = `
AI skills every Ghanaian student should learn in 2026 prompting verification
study workflows academic integrity privacy GigaLearn BECE WASSCE responsible AI
not a list of branded apps.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        In 2026, the useful question for Ghanaian students is not “which AI brand is trending?” It
        is “which <strong>skills</strong> help me learn faster without cheating myself?” This guide
        focuses on transferable habits for JHS, SHS and tertiary learners — skills that still matter
        when the app names change.
      </Prose>

      <ArticleH2 id="skills-not-apps">Skills, not app logos</ArticleH2>
      <Prose>
        Tools rotate. Skills compound. Prioritise abilities you can demonstrate with any responsible
        assistant — including{" "}
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> inside Giga3 AI — and with offline
        methods when data is expensive. For a category map of study tools, see{" "}
        <ArticleLink href="/blog/ai-tools-for-ghanaian-students-2026/">
          10 AI tools every Ghanaian student should know
        </ArticleLink>
        ; this article goes deeper on the skills underneath.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-students-group-study.jpg"
        alt="Ghanaian students revising together with textbooks and sticky notes"
        caption="AI should support group study — not replace the conversation."
      />

      <ArticleH2 id="prompting">Clear prompting</ArticleH2>
      <BulletList
        items={[
          "State your level (JHS, SHS, first-year university) and subject.",
          "Ask for steps, not only final answers — especially in maths and science.",
          "Provide the exact question or paragraph you are stuck on.",
          "Request examples that use Ghanaian contexts when helpful (cedis, local places) without forcing stereotypes.",
          "Iterate: “explain again with a simpler analogy” is a skill, not a weakness.",
        ]}
      />

      <ArticleH2 id="verification">Verification & sources</ArticleH2>
      <Prose>
        AI can sound confident while being wrong. Practise:
      </Prose>
      <BulletList
        items={[
          "Checking dates, formulas and definitions against textbooks or WAEC-aligned materials",
          "Re-solving maths by hand after reading an explanation",
          "Asking the model what could be wrong with its answer",
          "Preferring primary sources for news and civic claims — see our digital literacy guide on fact-checking",
        ]}
      />

      <ArticleH2 id="study-workflows">Study workflows</ArticleH2>
      <ArticleH3>Explain → practise → recall</ArticleH3>
      <Prose>
        Use AI to explain a tough topic, then close the chat and practise from memory. For BECE and
        WASSCE rhythms, combine this with{" "}
        <ArticleLink href="/blog/ai-for-bece-wassce-preparation-ghana/">
          AI for BECE and WASSCE preparation
        </ArticleLink>{" "}
        and the{" "}
        <ArticleLink href="/ai-for-bece-wassce-ghana/">Giga3 BECE &amp; WASSCE hub</ArticleLink>.
      </Prose>
      <ArticleH3>Notes that survive no-data days</ArticleH3>
      <Prose>
        Summarise explanations into your own notebook or offline docs. If the phone dies, your notes
        should still teach you.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-mobile-learning.jpg"
        alt="Student learning from a smartphone with earphones on a bus seat"
        caption="Mobile-first study is normal — save key notes for offline review."
      />

      <ArticleH2 id="integrity">Academic integrity</ArticleH2>
      <BulletList
        items={[
          "Do not submit AI text as your own coursework.",
          "Use AI to understand marking schemes and structure — then write in your voice.",
          "For coding classes, you must be able to explain every line you submit.",
          "When unsure, ask your teacher what is allowed before the deadline.",
        ]}
      />

      <ArticleH2 id="data-privacy">Data & privacy</ArticleH2>
      <BulletList
        items={[
          "Never paste passwords, Ghana Card numbers, or classmates’ personal data into prompts.",
          "Avoid uploading full answer booklets that contain other students’ work.",
          "Prefer school-approved tools when your institution sets a policy.",
        ]}
      />

      <ArticleH2 id="practice-plan">Four-week practice plan</ArticleH2>
      <BulletList
        items={[
          "Week 1: Practise writing three clear prompts per tough subject each week.",
          "Week 2: Add a verification step — textbook or teacher check — for every AI explanation.",
          "Week 3: Build a personal “error log” of mistakes AI helped you catch.",
          "Week 4: Teach one concept to a friend without looking at the chat history.",
        ]}
      />
      <Prose>
        If you are also deciding whether to learn coding first, read{" "}
        <ArticleLink href="/blog/coding-vs-ai-which-skill-beginners-learn-first/">
          coding vs AI: which skill beginners should learn first
        </ArticleLink>
        .
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/ai-tools-for-ghanaian-students-2026/", label: "AI tools for Ghanaian students" },
          { href: "/blog/wassce-ai-study-guide/", label: "WASSCE + AI study guide" },
          { href: "/blog/how-to-start-learning-coding-in-ghana/", label: "Start learning coding" },
          { href: "/gigalearn/", label: "GigaLearn" },
          { href: "/ai-for-teachers-ghana/", label: "AI for teachers in Ghana" },
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
          title="Build AI study skills in GigaLearn"
          description="Practise explanations, quizzes and responsible revision habits with GigaLearn on Giga3 AI."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AiSkillsEveryGhanaianStudent2026Body = { Body, plainText: PLAIN_TEXT };
