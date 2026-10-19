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
  { id: "pick-problem", label: "Pick a real problem" },
  { id: "scope", label: "Scope it small" },
  { id: "build-steps", label: "Build in five steps" },
  { id: "ghana-ideas", label: "Project ideas that fit Ghana" },
  { id: "show-work", label: "Show your work" },
  { id: "ai-help", label: "Use AI without skipping learning" },
  { id: "checklist", label: "Ship checklist" },
] as const;

export const PLAIN_TEXT = `
How to build your first software project as a beginner in Ghana
small scope five steps local project ideas portfolio README
GigaLearn Giga3 AI responsible help ship checklist.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Your first software project does not need investors, a startup name, or a perfect UI. It
        needs a <strong>clear problem</strong>, a <strong>tiny scope</strong>, and a version you can
        show someone else. This checklist is for beginners in Ghana who have started basics — see{" "}
        <ArticleLink href="/blog/how-to-start-learning-coding-in-ghana/">
          how to start learning coding
        </ArticleLink>{" "}
        — and are ready to ship something small.
      </Prose>

      <ArticleH2 id="pick-problem">Pick a real problem</ArticleH2>
      <Prose>
        Choose a problem you see weekly: tracking chop-money spending, listing club members,
        converting units for science class, or a one-page profile for a campus society. Real
        problems keep you motivated when tutorials get boring.
      </Prose>

      <ArticleFigure
        src="/images/blog/support-team-project-build.jpg"
        alt="Student team in Ghana collaborating around one laptop on a first project"
        caption="A friend who will click through your demo is better than an imaginary user."
      />

      <ArticleH2 id="scope">Scope it small</ArticleH2>
      <BulletList
        items={[
          "One user type (you, or one club secretary)",
          "One main action (add an item, calculate a total, show a list)",
          "No login system in version one unless a tutorial already covers it",
          "No payment integration in version one",
          "A success definition you can demo in under two minutes",
        ]}
      />
      <Prose>
        Write the success definition on paper before you open the editor.
      </Prose>

      <ArticleH2 id="build-steps">Build in five steps</ArticleH2>
      <ArticleH3>1. Sketch</ArticleH3>
      <Prose>Boxes and arrows only — screens on paper, not Figma perfection.</Prose>
      <ArticleH3>2. Data</ArticleH3>
      <Prose>List the fields you need (name, amount, date). Start with a simple array or spreadsheet export.</Prose>
      <ArticleH3>3. Happy path</ArticleH3>
      <Prose>Make the main action work once. Ignore edge cases until the happy path is solid.</Prose>
      <ArticleH3>4. Guardrails</ArticleH3>
      <Prose>Add basic validation (empty fields, non-numbers) and a clear error message.</Prose>
      <ArticleH3>5. Polish for demo</ArticleH3>
      <Prose>Readable labels, your name in the footer, and a short README.</Prose>

      <ArticleFigure
        src="/images/blog/support-coding-practice-desk.jpg"
        alt="Daily coding practice desk with laptop and phone charging"
        caption="Ship version one, then improve — do not polish forever in private."
      />

      <ArticleH2 id="ghana-ideas">Project ideas that fit Ghana</ArticleH2>
      <BulletList
        items={[
          "Chop-money / weekly budget tracker (cedis) in a simple web page",
          "BECE or WASSCE topic checklist with “done / revise / stuck” states",
          "Campus club attendance logger (names + dates)",
          "Market unit converter (e.g. recipe scaling) for a small business",
          "Personal learning log that stores what you studied each day",
        ]}
      />
      <Prose>
        Avoid copying a giant social network. Small tools you will actually use beat impressive
        demos you abandon.
      </Prose>

      <ArticleH2 id="show-work">Show your work</ArticleH2>
      <BulletList
        items={[
          "Put the code on GitHub (even if private at first, prepare to make it public).",
          "Write a README: problem, how to run, screenshots.",
          "Record a 60-second phone video of the demo.",
          "Ask one person outside your head to try it and note confusion.",
        ]}
      />

      <ArticleH2 id="ai-help">Use AI without skipping learning</ArticleH2>
      <Prose>
        AI is useful for explaining errors and suggesting approaches. It is harmful when you paste
        an entire project brief and submit code you cannot explain. Rules of thumb:
      </Prose>
      <BulletList
        items={[
          "Ask for an explanation of an error before asking for a full rewrite.",
          "Re-type suggested fixes so they pass through your fingers.",
          "Keep a “what I still do not understand” list and clear it weekly.",
          "Use GigaLearn for concept explanations tied to school subjects when your project is study-related.",
        ]}
      />
      <Prose>
        For the broader coding-versus-AI decision, see{" "}
        <ArticleLink href="/blog/coding-vs-ai-which-skill-beginners-learn-first/">
          which skill beginners should learn first
        </ArticleLink>
        .
      </Prose>

      <ArticleH2 id="checklist">Ship checklist</ArticleH2>
      <BulletList
        items={[
          "Success definition written down",
          "Happy path works on your machine",
          "Basic validation for empty or bad input",
          "README with run steps",
          "One external person tried it",
          "You can explain every major function without reading AI chat history",
        ]}
      />
      <Prose>
        When that list is green, celebrate — then start project two with one new skill only.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/how-to-start-learning-coding-in-ghana/", label: "Start learning coding in Ghana" },
          { href: "/blog/one-million-coders-ghana-courses-skills-careers/", label: "Courses, skills & careers" },
          { href: "/blog/ai-skills-every-ghanaian-student-should-learn-2026/", label: "AI skills for students" },
          { href: "/gigalearn/", label: "GigaLearn" },
          { href: "/documents/", label: "Document Studio for write-ups" },
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
          title="Stuck on a concept while building?"
          description="Use GigaLearn to unpack the idea, then return to your project and implement it yourself."
          href="/gigalearn/"
          label="Open GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const HowToBuildFirstSoftwareProjectBody = { Body, plainText: PLAIN_TEXT };
