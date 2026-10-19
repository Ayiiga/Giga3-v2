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
  { id: "false-choice", label: "It is not either/or" },
  { id: "learn-coding-first", label: "When coding first wins" },
  { id: "learn-ai-first", label: "When AI literacy first wins" },
  { id: "combined-path", label: "A combined 8-week path" },
  { id: "decision-checklist", label: "Decision checklist" },
  { id: "ghana-context", label: "Ghana context" },
] as const;

export const PLAIN_TEXT = `
Coding vs AI which skill should beginners learn first Ghana students
coding fundamentals AI literacy prompting verification combined path
GigaLearn Giga3 practical decision checklist.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Beginners in Ghana often ask a binary question: should I learn <strong>coding</strong> or{" "}
        <strong>AI</strong> first? The productive answer is usually “both, in a deliberate order.”
        This article helps you choose a starting emphasis for the next eight weeks without pretending
        one path makes the other obsolete.
      </Prose>

      <ArticleH2 id="false-choice">It is not either/or</ArticleH2>
      <Prose>
        Coding teaches you how software is structured. AI literacy teaches you how to use powerful
        assistants without outsourcing your thinking. People who only prompt without fundamentals
        struggle to debug. People who only code without AI literacy move slower than peers who can
        explain errors and explore options quickly.
      </Prose>

      <ArticleFigure
        src="/images/blog/ai-creator-coding-comparison-ghana.jpg"
        alt="One learner sketching ideas while another writes simple code in the same co-working room"
        caption="Different desks, shared goal: useful digital skills."
      />

      <ArticleH2 id="learn-coding-first">When coding first wins</ArticleH2>
      <BulletList
        items={[
          "You want to build websites, scripts, or apps yourself.",
          "You enjoy puzzles and precise instructions.",
          "Your school or campus club already has a programming track.",
          "You are applying to CS-related programmes that expect fundamentals.",
        ]}
      />
      <Prose>
        Start with the beginner coding guide:{" "}
        <ArticleLink href="/blog/how-to-start-learning-coding-in-ghana/">
          how to start learning coding in Ghana
        </ArticleLink>
        . Use AI as a tutor for errors — not as an autopilot that writes whole assignments.
      </Prose>

      <ArticleH2 id="learn-ai-first">When AI literacy first wins</ArticleH2>
      <BulletList
        items={[
          "Your immediate need is exam revision, writing structure, or research help.",
          "You have very limited device time and need study leverage quickly.",
          "You work in a non-CS field but want responsible AI habits this term.",
          "You feel intimidated by code syntax and need confidence wins first.",
        ]}
      />
      <Prose>
        Begin with{" "}
        <ArticleLink href="/blog/ai-skills-every-ghanaian-student-should-learn-2026/">
          AI skills every Ghanaian student should learn in 2026
        </ArticleLink>
        , then add a light coding module once prompting and verification feel natural.
      </Prose>

      <ArticleH2 id="combined-path">A combined 8-week path</ArticleH2>
      <ArticleH3>Weeks 1–2 — AI literacy core</ArticleH3>
      <Prose>
        Practise clear prompts, verification, and note-taking in one school subject. Use GigaLearn
        for explanations, then close the app and recall from memory.
      </Prose>
      <ArticleH3>Weeks 3–5 — coding fundamentals</ArticleH3>
      <Prose>
        Pick HTML/CSS/JS or Python. Ship one tiny project. When stuck, paste the error into AI and
        ask for possible causes — then test the fix yourself.
      </Prose>
      <ArticleH3>Weeks 6–8 — combine</ArticleH3>
      <Prose>
        Build a small project where AI helps with ideas and docs, but you own the code. Write a short
        reflection: what AI got wrong, what you corrected.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-coding-mentorship.jpg"
        alt="Mentor guiding a young Ghanaian learner at a laptop"
        caption="A mentor or study partner accelerates both tracks."
      />

      <ArticleH2 id="decision-checklist">Decision checklist</ArticleH2>
      <BulletList
        items={[
          "Goal this term: build software → coding first.",
          "Goal this term: pass exams with better understanding → AI literacy first.",
          "Energy: if syntax dread is blocking you, start with AI literacy for two weeks, then code.",
          "Device limits: phone-only? Prefer AI study skills + micro coding exercises in browser editors.",
          "Integrity: whichever path you choose, you must be able to explain your work.",
        ]}
      />

      <ArticleH2 id="ghana-context">Ghana context</ArticleH2>
      <Prose>
        Public digital-skills programmes and campus clubs may offer both coding and AI-related
        modules. Choose based on the syllabus you can finish, not marketing slogans. Pair any
        cohort with personal projects — see{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-courses-skills-careers/">
          One Million Coders: courses, skills and careers
        </ArticleLink>{" "}
        and{" "}
        <ArticleLink href="/blog/how-to-build-first-software-project-beginner-ghana/">
          your first software project guide
        </ArticleLink>
        .
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/how-to-start-learning-coding-in-ghana/", label: "Start learning coding" },
          { href: "/blog/ai-skills-every-ghanaian-student-should-learn-2026/", label: "AI skills for students 2026" },
          { href: "/blog/chatgpt-vs-gemini-vs-claude-ghana-2026/", label: "ChatGPT vs Gemini vs Claude" },
          { href: "/gigalearn/", label: "GigaLearn" },
          { href: "/ai-tools-for-students-ghana/", label: "AI tools for students hub" },
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
          title="Practise both sides on Giga3"
          description="Use GigaLearn for study explanations and Giga3 chat when you need help unpacking coding errors."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const CodingVsAiBeginnersBody = { Body, plainText: PLAIN_TEXT };
