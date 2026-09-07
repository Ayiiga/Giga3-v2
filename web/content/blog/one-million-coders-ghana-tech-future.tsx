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
  { id: "programme-overview", label: "What the programme is" },
  { id: "verified-numbers", label: "Verified numbers" },
  { id: "skills-tracks", label: "Skills on offer" },
  { id: "opportunities", label: "Opportunities for youth" },
  { id: "challenges", label: "Realistic challenges" },
  { id: "next-steps", label: "What you can do now" },
] as const;

export const PLAIN_TEXT = `
One Million Coders Ghana government digital skills programme four years one million trainees.
Verified pilot 859 beneficiaries 2026 target 400000 enrolment 140000 official portal.
Courses cybersecurity data analytics AI software development UI UX cloud computing.
Opportunities employment remote work entrepreneurship youth Ghana tech ecosystem.
Challenges funding scale delivery capacity realistic expectations Africa tech powerhouse.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghana&apos;s <strong>One Million Coders</strong> programme aims to train one million people
        in coding and digital skills over four years. It is one of the country&apos;s most
        ambitious workforce programmes — but ambition alone does not make a tech powerhouse. This
        article explains what is verified, what is planned, and what young Ghanaians should
        realistically expect.
      </Prose>

      <ArticleH2 id="programme-overview">What the programme is</ArticleH2>
      <Prose>
        Launched under Ghana&apos;s digital transformation agenda, the programme offers structured
        online and centre-based training through the official portal at{" "}
        <strong>onemillioncoders.gov.gh</strong>. Registration typically requires a Ghana Card.
        Training tracks include software development, cybersecurity, data analytics, artificial
        intelligence, cloud computing, and UI/UX design, among others.
      </Prose>
      <Prose>
        Government messaging emphasises not just certificates but pathways to employment,
        entrepreneurship, and remote work — partnering with universities, tech firms, and global
        platforms for recognised credentials.
      </Prose>

      <ArticleH2 id="verified-numbers">Verified numbers</ArticleH2>
      <Prose>
        Always distinguish official milestones from marketing targets:
      </Prose>
      <BulletList
        items={[
          "Pilot phase (2025): 859 beneficiaries completed training — reported by Ghana News Agency.",
          "2026 target: Government aims to train 400,000 beneficiaries this year — a stated goal, not yet an outcome.",
          "Phase Two completions: Over 12,000 course completions reported within weeks of a May 2026 phase launch — growing, but far below the annual target.",
          "Enrolment: The official portal reports substantial registration interest; exact live enrolment should be checked on onemillioncoders.gov.gh.",
        ]}
      />
      <Prose>
        Independent analysts have questioned whether delivery capacity and confirmed budget
        disbursements can scale from hundreds of pilot graduates to hundreds of thousands annually.
        That scepticism is healthy — it pushes for transparent progress reports, not cheerleading.
      </Prose>

      <ArticleH2 id="skills-tracks">Skills on offer</ArticleH2>
      <Prose>
        The programme advertises roughly 30 courses ranging from short introductions to longer
        professional tracks. AI and software development are included — relevant for students also
        exploring tools on{" "}
        <ArticleLink href="/blog/ai-tools-for-ghanaian-students-2026/">
          our student AI guide
        </ArticleLink>.
      </Prose>
      <ArticleH3>Complementary learning</ArticleH3>
      <Prose>
        Programme certificates plus personal projects beat certificates alone. Build a portfolio:
        small apps, data visualisations, or automation scripts. Supplement formal tracks with daily
        practice on <ArticleLink href="/chat/login/">Giga3 AI Chat</ArticleLink> for problem-solving
        and documentation help.
      </Prose>

      <ArticleH2 id="opportunities">Opportunities for youth</ArticleH2>
      <BulletList
        items={[
          "Local tech jobs: Ghana's startup scene hires developers, analysts, and support engineers.",
          "Remote work: International freelancing is possible but competitive — skills and proof matter.",
          "Entrepreneurship: Digital products and services for Ghanaian SMEs remain underserved.",
          "AI literacy: Understanding AI tools is increasingly expected across roles, not only in 'AI jobs'.",
        ]}
      />
      <Prose>
        Ghana will not become &quot;Africa&apos;s next tech powerhouse&quot; overnight. Progress is
        incremental: better connectivity, clearer policy, more founders, and thousands of skilled
        graduates — not a single headline.
      </Prose>

      <ArticleH2 id="challenges">Realistic challenges</ArticleH2>
      <BulletList
        items={[
          "Scale: Moving from pilot cohorts to nationwide delivery requires trainers, devices, and connectivity.",
          "Funding clarity: Budget lines exist, but public detail on actual disbursements has been limited in media reports.",
          "Job matching: Training without internships or employer links risks certificate inflation.",
          "Quality control: Not every short course produces job-ready skills — choose tracks deliberately.",
        ]}
      />

      <ArticleH2 id="next-steps">What you can do now</ArticleH2>
      <Prose>
        Register on the official portal if you meet requirements. Pair programme courses with
        personal projects, open-source contributions, and AI-assisted learning via{" "}
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink>. Read{" "}
        <ArticleLink href="/blog/ghana-ai-future-opportunities-challenges/">
          Ghana&apos;s AI future
        </ArticleLink>{" "}
        for the broader picture.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/ghana-ai-future-opportunities-challenges/", label: "Ghana's AI future" },
          { href: "/blog/african-youth-ai-future-jobs/", label: "African youth and AI jobs" },
          { href: "/blog/ai-tools-for-ghanaian-students-2026/", label: "AI tools for students" },
          { href: "/ai-for-ghana/", label: "AI for Ghana overview" },
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
          title="Practice coding concepts with Giga3 AI"
          description="Chat through problems, document projects, and learn AI skills alongside formal training."
          href="/chat/login/"
          label="Start free"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const OneMillionCodersGhanaBody = { Body, plainText: PLAIN_TEXT };
