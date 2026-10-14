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
  { id: "why-start", label: "Why start now" },
  { id: "mindset", label: "Mindset that helps" },
  { id: "first-tools", label: "First tools you need" },
  { id: "30-day-plan", label: "A practical 30-day plan" },
  { id: "ghana-paths", label: "Learning paths in Ghana" },
  { id: "common-traps", label: "Common traps" },
  { id: "next-steps", label: "What to do next" },
] as const;

export const PLAIN_TEXT = `
How to start learning coding in Ghana beginner guide laptop phone free tools HTML CSS
JavaScript Python practice projects GigaLearn Giga3 AI 30-day plan community hubs
One Million Coders official portal without inventing enrolment numbers.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        You do not need an expensive laptop, a computer-science degree, or perfect English to begin
        coding in Ghana. You need a clear first step, a small weekly habit, and projects that prove
        you can solve real problems. This guide is for absolute beginners — JHS and SHS students,
        university learners, and career switchers — who want a practical start without hype.
      </Prose>

      <ArticleH2 id="why-start">Why start now</ArticleH2>
      <Prose>
        Coding is not only for Silicon Valley. In Ghana it shows up in school portals, mobile money
        flows, small-business WhatsApp catalogues, NGO data tools, and creator apps. Learning to
        code also trains you to break big problems into steps — a skill that transfers to{" "}
        <ArticleLink href="/blog/ai-skills-every-ghanaian-student-should-learn-2026/">
          AI skills
        </ArticleLink>{" "}
        and everyday digital work.
      </Prose>
      <Prose>
        Start for curiosity and capability, not for guaranteed salaries. Job markets change;
        portfolios and clear thinking travel with you.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-coding-practice-desk.jpg"
        alt="Hands typing on a laptop at a simple home study desk in Ghana"
        caption="A quiet daily practice block beats weekend binge tutorials."
      />

      <ArticleH2 id="mindset">Mindset that helps</ArticleH2>
      <BulletList
        items={[
          "Aim for understanding, not copying. Type examples yourself.",
          "Expect confusion — bugs are normal feedback, not failure.",
          "Prefer one language deeply for three months over five languages lightly.",
          "Build tiny projects early so learning stays concrete.",
          "Ask for help with what you tried, not only “it does not work”.",
        ]}
      />

      <ArticleH2 id="first-tools">First tools you need</ArticleH2>
      <Prose>
        Keep the setup light so data and power constraints do not stop you:
      </Prose>
      <BulletList
        items={[
          "A laptop if you can; otherwise a phone plus an online editor for short sessions.",
          "A free code editor such as VS Code when you have a computer.",
          "A free GitHub account to save projects (learn commits gradually).",
          "Offline notes: write commands and errors in a notebook when data is expensive.",
          "Optional: Giga3 AI chat or GigaLearn to explain error messages — then verify against docs.",
        ]}
      />
      <ArticleH3>Which language first?</ArticleH3>
      <Prose>
        For absolute beginners who want to see results quickly, start with{" "}
        <strong>HTML, CSS, and a little JavaScript</strong> so you can publish a simple page. If you
        prefer data, automation, or school maths projects, start with <strong>Python</strong>. Either
        path is valid — pick one and stay for 30 days. See also{" "}
        <ArticleLink href="/blog/coding-vs-ai-which-skill-beginners-learn-first/">
          coding vs AI for beginners
        </ArticleLink>
        .
      </Prose>

      <ArticleH2 id="30-day-plan">A practical 30-day plan</ArticleH2>
      <BulletList
        items={[
          "Days 1–7: Learn basic syntax and run “hello world” programmes daily (20–40 minutes).",
          "Days 8–14: Build one tiny project — a personal profile page or a tip calculator.",
          "Days 15–21: Add one feature you did not copy from a tutorial (a new section or input).",
          "Days 22–28: Clean the project, write a short README, share with a friend for feedback.",
          "Days 29–30: Plan project two using the checklist in our first-project guide.",
        ]}
      />
      <Prose>
        Missed a day? Restart the next day — streaks help, shame does not.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-skills-roadmap-notebook.jpg"
        alt="Open notebook with a simple hand-drawn skills roadmap beside a laptop"
        caption="Write a four-week roadmap you can actually finish."
      />

      <ArticleH2 id="ghana-paths">Learning paths in Ghana</ArticleH2>
      <Prose>
        Combine self-study with local structure when it helps:
      </Prose>
      <BulletList
        items={[
          "School clubs and campus developer communities — ask seniors what they used in year one.",
          "Community tech hubs and open meetups — focus on builders, not only certificate talks.",
          "National digital-skills programmes such as One Million Coders — check course details on the official portal (onemillioncoders.gov.gh) rather than social-media rumours.",
          "GigaLearn for study habits and explanation practice alongside coding tutorials.",
        ]}
      />
      <Prose>
        For a careful look at skills tracks and career framing around One Million Coders, read{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-courses-skills-careers/">
          courses, skills and career opportunities
        </ArticleLink>
        . We do not invent enrolment or employment numbers here.
      </Prose>

      <ArticleH2 id="common-traps">Common traps</ArticleH2>
      <BulletList
        items={[
          "Tutorial hell — watching without building.",
          "Buying courses before finishing free fundamentals.",
          "Comparing your week one to someone’s year three on Twitter.",
          "Letting AI write whole programmes you cannot explain (use it to debug, not to skip thinking).",
          "Waiting for “perfect internet” — download docs when Wi‑Fi is good.",
        ]}
      />

      <ArticleH2 id="next-steps">What to do next</ArticleH2>
      <Prose>
        Today: install or open an editor, write a programme that prints your name, and save the file.
        This week: finish one tiny project and start{" "}
        <ArticleLink href="/blog/how-to-build-first-software-project-beginner-ghana/">
          your first software project checklist
        </ArticleLink>
        .
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/coding-vs-ai-which-skill-beginners-learn-first/", label: "Coding vs AI for beginners" },
          { href: "/blog/how-to-build-first-software-project-beginner-ghana/", label: "Build your first project" },
          { href: "/blog/one-million-coders-ghana-courses-skills-careers/", label: "One Million Coders: courses & careers" },
          { href: "/gigalearn/", label: "GigaLearn" },
          { href: "/ai-tools-for-students-ghana/", label: "AI tools for students" },
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
          title="Practise explanations with GigaLearn"
          description="Use GigaLearn and Giga3 AI to unpack error messages — then verify with docs and your own tests."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const HowToStartLearningCodingInGhanaBody = { Body, plainText: PLAIN_TEXT };
