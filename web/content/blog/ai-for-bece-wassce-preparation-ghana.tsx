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
  { id: "how-ai-helps", label: "How AI helps exam revision" },
  { id: "mathematics", label: "Mathematics" },
  { id: "science", label: "Integrated science" },
  { id: "english", label: "English language" },
  { id: "social-studies", label: "Social studies" },
  { id: "responsible-use", label: "Responsible AI use" },
  { id: "gigalearn", label: "Using GigaLearn" },
  { id: "study-plan", label: "Sample weekly plan" },
] as const;

export const PLAIN_TEXT = `
How AI helps BECE WASSCE revision practice questions explain topics verify answers.
Mathematics step by step algebra geometry show working check calculator.
Integrated science biology chemistry physics definitions experiments.
English comprehension essay structure grammar vocabulary.
Social studies Ghana history civics geography source checking.
Responsible use plagiarism academic integrity verify teachers textbooks.
GigaLearn structured tutoring Giga3 AI chat modes study planner.
Weekly study plan subjects rotation rest mock exams.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        National exams shape educational pathways for millions of Ghanaian students. BECE and WASSCE
        reward consistent revision, clear writing, and accurate problem-solving — not last-minute
        shortcuts. Used well, AI can act like a patient study partner: generating practice questions,
        explaining difficult topics, and helping you spot gaps before the real paper.
      </Prose>
      <Prose>
        This guide focuses on <strong>studying with AI</strong> in ways that strengthen understanding.
        It is not a promise of grades, and it is not an invitation to copy generated essays into an
        exam hall. Treat every AI answer as a draft you must verify against textbooks, past questions,
        and your teachers.
      </Prose>

      <ArticleH2 id="how-ai-helps">How AI helps exam revision</ArticleH2>
      <Prose>
        The most effective pattern has three steps: <em>ask</em>, <em>attempt</em>, and{" "}
        <em>verify</em>. Ask AI to explain a concept or generate a practice question. Attempt the
        question yourself on paper. Verify the result using marking schemes, class notes, or a
        teacher&apos;s feedback.
      </Prose>
      <BulletList
        items={[
          "Generate practice questions at the right difficulty — request BECE or WASSCE style.",
          "Break down worked examples when a textbook explanation feels too dense.",
          "Create flashcard-style summaries you rewrite in your own words.",
          "Plan a revision timetable around weak topics identified in mocks.",
          "Translate complex wording into simpler English when language is the barrier.",
        ]}
      />
      <Prose>
        For a broader look at student tools, see{" "}
        <ArticleLink href="/blog/best-ai-tools-in-ghana-2026/">
          Best AI Tools in Ghana 2026
        </ArticleLink>{" "}
        and <ArticleLink href="/ai-tools-for-students-ghana/">AI tools for university students</ArticleLink>.
      </Prose>

      <ArticleH2 id="mathematics">Mathematics</ArticleH2>
      <Prose>
        Maths rewards showing working. Ask AI to demonstrate a method, then close the chat and solve
        a similar problem without looking. Common BECE and WASSCE topics include algebra, geometry,
        statistics, and word problems involving Ghanaian contexts (currency, distance, time).
      </Prose>
      <ArticleH3>Practical prompts</ArticleH3>
      <BulletList
        items={[
          "Explain how to factorise this expression step by step, then give me two similar questions.",
          "I got 12 but the answer key says 15 — where did I likely go wrong?",
          "Create five short word problems using Ghana cedis and kilometres.",
        ]}
      />
      <Prose>
        Always redo calculations manually. AI arithmetic errors are common; your examiner will not
        accept &quot;the chatbot said so.&quot;
      </Prose>

      <ArticleH2 id="science">Integrated science</ArticleH2>
      <Prose>
        Science papers test definitions, diagrams, and application. Use AI to clarify processes —
        photosynthesis, electricity, acids and bases — then draw the diagram yourself from memory.
        Ask for simple home-safe experiments only; never attempt unsafe lab work suggested online.
      </Prose>
      <ArticleH3>Revision habits</ArticleH3>
      <BulletList
        items={[
          "Turn each syllabus objective into one question you can answer aloud.",
          "Compare AI explanations with your WAEC-aligned textbook.",
          "Use AI to create mnemonics, then rewrite them so they make sense to you.",
        ]}
      />

      <ArticleH2 id="english">English language</ArticleH2>
      <Prose>
        English rewards reading comprehension, summary skills, and structured essays. AI can suggest
        essay outlines and point out grammar issues, but examiners reward your own voice and
        arguments. Use AI to brainstorm ideas, not to submit untouched paragraphs as your own.
      </Prose>
      <BulletList
        items={[
          "Paste your paragraph and ask for grammar feedback — then edit manually.",
          "Request comprehension questions for a passage you already own legally.",
          "Practise summarising articles in exactly the word limit WASSCE expects.",
        ]}
      />

      <ArticleH2 id="social-studies">Social studies</ArticleH2>
      <Prose>
        Social studies connects history, government, geography, and citizenship. AI can help organise
        timelines and compare institutions, but Ghana-specific facts must be checked against
        curriculum materials. Ask for sources; if the model cannot cite one, verify elsewhere.
      </Prose>
      <Prose>
        Link classroom learning to current affairs carefully — use reputable news outlets and your
        teacher&apos;s guidance when discussing political topics.
      </Prose>

      <ArticleH2 id="responsible-use">Responsible AI use and avoiding plagiarism</ArticleH2>
      <Prose>
        Schools increasingly expect honesty about AI assistance. <strong>Avoiding plagiarism</strong>{" "}
        means you submit work you understand and can defend orally if asked. Copying a model&apos;s essay
        verbatim violates that standard even if detection tools do not flag it.
      </Prose>
      <BulletList
        items={[
          "Rewrite every explanation in your own words.",
          "Cite AI assistance when your school policy requires it.",
          "Never bring unauthorised devices or materials into the exam hall.",
          "Verify AI answers — models hallucinate dates, names, and formulas.",
          "Ask teachers which uses are allowed for coursework vs take-home assignments.",
        ]}
      />
      <Prose>
        Read <ArticleLink href="/legal/ai-usage/">Giga3 AI Usage Policy</ArticleLink> for platform
        rules that mirror good academic habits.
      </Prose>

      <ArticleH2 id="gigalearn">Using GigaLearn for structured study</ArticleH2>
      <Prose>
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> is Giga3&apos;s learning-focused
        experience for step-by-step explanations. Where general chat might jump to an answer,
        learning modes encourage breaking problems into stages — useful when you are rebuilding
        confidence in maths or science before mocks.
      </Prose>
      <Prose>
        Pair GigaLearn with general chat on{" "}
        <ArticleLink href="/chat/login/">Giga3 AI Chat</ArticleLink>: use learning mode for core
        concepts, then chat for quick drills and vocabulary. Both run in the same PWA with shared
        credits — see <ArticleLink href="/pricing/">pricing</ArticleLink> for current plans.
      </Prose>

      <ArticleH2 id="study-plan">Sample weekly revision plan</ArticleH2>
      <Prose>
        Adjust times to your school schedule. The goal is spaced repetition, not marathon cramming.
      </Prose>
      <BulletList
        items={[
          "Monday — Maths: 40 minutes practice + 20 minutes AI-assisted error review.",
          "Tuesday — English: comprehension passage + outline one essay.",
          "Wednesday — Science: one topic summary + five short questions.",
          "Thursday — Social studies: timeline + practice short answers.",
          "Friday — Mixed mock: timed section + self-marking.",
          "Weekend — Rest, light reading, and redo only the questions you missed.",
        ]}
      />

      <RelatedReading
        links={[
          { href: "/gigalearn/", label: "GigaLearn — AI tutor" },
          { href: "/blog/best-ai-tools-in-ghana-2026/", label: "Best AI tools in Ghana" },
          { href: "/ai-for-ghana/", label: "AI for Ghana overview" },
          { href: "/blog/top-ai-apps-in-ghana-2026/", label: "Top AI apps in Ghana" },
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
          title="Revise smarter with GigaLearn"
          description="Structured explanations and practice-friendly chat — built for students who want to understand, not copy."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AiForBeceWassceBody = { Body, plainText: PLAIN_TEXT };
