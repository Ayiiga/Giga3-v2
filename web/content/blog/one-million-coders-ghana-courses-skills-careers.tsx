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
  { id: "how-to-read", label: "How to read this guide" },
  { id: "course-families", label: "Course families to expect" },
  { id: "skills-map", label: "Skills map for beginners" },
  { id: "career-paths", label: "Career paths — without hype" },
  { id: "how-to-choose", label: "How to choose a track" },
  { id: "pair-with-practice", label: "Pair training with practice" },
  { id: "verify", label: "Verify before you enrol" },
] as const;

export const PLAIN_TEXT = `
One Million Coders Ghana courses skills career opportunities official portal
software development cybersecurity data analytics AI UI UX cloud
beginner track choice portfolio practice GigaLearn no invented statistics.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghana&apos;s <strong>One Million Coders</strong> programme is often discussed as a single
        headline. For learners, what matters more is which <em>course families</em> and{" "}
        <em>skills</em> you can practise, and how those skills map to realistic early career steps.
        This article focuses on that map. For programme background and what is publicly verified
        versus still a target, see our companion piece{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-tech-future/">
          One Million Coders: Ghana&apos;s tech powerhouse bid
        </ArticleLink>
        .
      </Prose>

      <ArticleH2 id="how-to-read">How to read this guide</ArticleH2>
      <Prose>
        We describe common digital-skills tracks associated with large public programmes and industry
        training — not a private syllabus dump. Course names, schedules, and entry rules change.
        Always confirm the current catalogue on the official portal at{" "}
        <strong>onemillioncoders.gov.gh</strong> (and any partner university or hub you join). We do
        not invent enrolment figures, completion rates, or guaranteed jobs.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-campus-opportunity.jpg"
        alt="Young people networking on a Ghanaian campus about digital careers"
        caption="Treat programmes as a launchpad — portfolios still decide early opportunities."
      />

      <ArticleH2 id="course-families">Course families to expect</ArticleH2>
      <Prose>
        Public messaging and partner materials commonly group training into families such as:
      </Prose>
      <BulletList
        items={[
          "Software development — web or app fundamentals, version control, basic deployment ideas.",
          "Cybersecurity — awareness, safe systems thinking, introductory defensive skills.",
          "Data analytics — spreadsheets to basic analysis pipelines and visualisation habits.",
          "Artificial intelligence — concepts, responsible use, and applied tooling (depth varies by cohort).",
          "UI/UX design — user research basics, wireframes, and accessible interfaces.",
          "Cloud computing — core services vocabulary and simple deploy/host patterns.",
        ]}
      />
      <Prose>
        Exact module lists depend on the cohort and provider. Screenshot the syllabus before you
        start so you can measure progress against something concrete.
      </Prose>

      <ArticleH2 id="skills-map">Skills map for beginners</ArticleH2>
      <ArticleH3>Foundation skills every track still needs</ArticleH3>
      <BulletList
        items={[
          "Typing comfort and file organisation",
          "Reading documentation slowly",
          "Breaking a problem into steps",
          "Asking clear questions with screenshots or error text",
          "Basic English or local-language technical vocabulary — progress over perfection",
        ]}
      />
      <ArticleH3>Track-flavoured skills</ArticleH3>
      <BulletList
        items={[
          "Development: HTML/CSS/JS or Python, Git, one small deployed or shared project",
          "Data: clean tables, simple charts, honest conclusions (no fake precision)",
          "Design: user goals, low-fidelity sketches, feedback loops",
          "Security: password hygiene, phishing awareness, least-privilege thinking",
          "AI: prompt clarity, fact-checking outputs, knowing when not to automate",
        ]}
      />

      <ArticleFigure
        src="/images/blog/support-skills-roadmap-notebook.jpg"
        alt="Notebook roadmap for digital skills next to a laptop"
        caption="Map skills to weekly practice, not only to certificates."
      />

      <ArticleH2 id="career-paths">Career paths — without hype</ArticleH2>
      <Prose>
        Early opportunities in Ghana and remote markets often look like{" "}
        <strong>internships, junior roles, freelance gigs, NGO tech support, and creator tooling</strong> —
        not instant senior engineer salaries. Useful directions after foundational training:
      </Prose>
      <BulletList
        items={[
          "Junior web or support roles that value reliable delivery and clear communication",
          "Campus or SME freelance work: school sites, simple business pages, data cleanup",
          "Teaching-assistant or peer-mentor roles once you can explain basics to others",
          "Cross-over into product design, QA, or data ops if that matches your strengths",
        ]}
      />
      <Prose>
        No programme can promise employment outcomes. Employers and clients look for proof of work —
        see{" "}
        <ArticleLink href="/blog/how-to-build-first-software-project-beginner-ghana/">
          how to build your first software project
        </ArticleLink>
        .
      </Prose>

      <ArticleH2 id="how-to-choose">How to choose a track</ArticleH2>
      <BulletList
        items={[
          "Pick the track that matches problems you already care about (school, shop, church, campus club).",
          "Check device requirements — some cloud or design tools are painful on weak laptops.",
          "Prefer tracks with a graded project or portfolio artefact.",
          "Ask alumni what they built, not only what certificate they received.",
          "If you are brand new to code, read our beginner coding guide before advanced AI tracks.",
        ]}
      />

      <ArticleH2 id="pair-with-practice">Pair training with practice</ArticleH2>
      <Prose>
        Cohort videos alone rarely stick. Each week, ship something small: a page, a script, a
        chart, or a redesign. Use{" "}
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> and Giga3 AI to explain concepts —
        then re-implement without the AI window open. For study-focused AI habits, see{" "}
        <ArticleLink href="/blog/ai-skills-every-ghanaian-student-should-learn-2026/">
          AI skills every Ghanaian student should learn in 2026
        </ArticleLink>
        .
      </Prose>

      <ArticleH2 id="verify">Verify before you enrol</ArticleH2>
      <BulletList
        items={[
          "Confirm the URL is the official government portal or a named partner you trust.",
          "Note start dates, time commitment, and whether a Ghana Card is required.",
          "Ignore social posts that invent “guaranteed jobs” or secret cut-off scores.",
          "Keep copies of your enrolment confirmation and syllabus PDF.",
        ]}
      />

      <RelatedReading
        links={[
          { href: "/blog/one-million-coders-ghana-tech-future/", label: "One Million Coders overview" },
          { href: "/blog/how-to-start-learning-coding-in-ghana/", label: "Start learning coding in Ghana" },
          { href: "/blog/african-youth-ai-future-jobs/", label: "African youth, AI and future jobs" },
          { href: "/gigalearn/", label: "GigaLearn" },
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
          title="Turn course weeks into skills"
          description="Practise explanations and revision habits in GigaLearn while you follow any coding track."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const OneMillionCodersCoursesSkillsCareersBody = { Body, plainText: PLAIN_TEXT };
