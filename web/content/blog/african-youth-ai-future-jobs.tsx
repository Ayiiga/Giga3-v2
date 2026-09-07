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
  { id: "jobs-changing", label: "How work is changing" },
  { id: "ai-literacy", label: "Why AI literacy matters" },
  { id: "human-skills", label: "Human skills that still matter" },
  { id: "practical-steps", label: "Practical steps for youth" },
  { id: "african-context", label: "An African perspective" },
] as const;

export const PLAIN_TEXT = `
African youth AI literacy future of work digital skills coding creativity critical thinking entrepreneurship.
Jobs revolution tasks workflows not every job eliminated fearmongering practical steps education Ghana Africa.
GigaLearn One Million Coders AI tools students teachers.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Artificial intelligence is reshaping work worldwide — and African youth will feel that shift
        in classrooms, farms, clinics, and startups. The question is not whether AI matters, but
        whether young people learn to <strong>work with it</strong> before outdated skills lose
        relevance.
      </Prose>
      <Prose>
        This is not fearmongering. AI is more likely to change <em>tasks and workflows</em> than to
        eliminate every job overnight. Preparation beats panic.
      </Prose>

      <ArticleH2 id="jobs-changing">How work is changing</ArticleH2>
      <Prose>
        Repetitive writing, basic data entry, first-draft design, and routine customer queries are
        increasingly AI-assisted. Roles that combine judgment, relationships, craft, and local
        context — teachers, nurses, artisans, founders — evolve rather than vanish, but the skill
        mix changes.
      </Prose>

      <ArticleH2 id="ai-literacy">Why AI literacy matters</ArticleH2>
      <Prose>
        AI literacy means knowing what tools can do, where they fail, and how to verify output. It
        includes prompt skills, data privacy habits, and ethical use — not only coding. Students
        should start early with guides like{" "}
        <ArticleLink href="/blog/ai-tools-for-ghanaian-students-2026/">
          10 AI tools for Ghanaian students
        </ArticleLink>.
      </Prose>

      <ArticleH2 id="human-skills">Human skills that still matter</ArticleH2>
      <BulletList
        items={[
          "Critical thinking and fact-checking — see our social media literacy guide.",
          "Creativity and taste — AI drafts; humans choose what resonates.",
          "Communication and empathy — especially in education and healthcare.",
          "Entrepreneurship — building services AI alone cannot deliver locally.",
          "Collaboration and leadership across teams and communities.",
        ]}
      />

      <ArticleH2 id="practical-steps">Practical steps for youth</ArticleH2>
      <BulletList
        items={[
          "Learn one AI tool deeply — e.g. Giga3 AI Chat or GigaLearn — before chasing ten apps.",
          "Build a portfolio project: app, blog, dataset, or community service with digital tools.",
          "Explore coding via Ghana's One Million Coders programme alongside school.",
          "Practice verifying information — read our Facebook/TikTok/WhatsApp fact-checking guide.",
          "Follow ethical rules: disclose AI use, protect privacy, reject cheating.",
        ]}
      />

      <ArticleH2 id="african-context">An African perspective</ArticleH2>
      <Prose>
        Africa&apos;s youth dividend is real — but only if education and job markets keep pace.
        Governments, schools, and businesses must invest in connectivity, training, and fair
        opportunity. Read{" "}
        <ArticleLink href="/blog/ghana-ai-future-opportunities-challenges/">
          Ghana&apos;s AI future
        </ArticleLink>{" "}
        for a country-level view and{" "}
        <ArticleLink href="/ai-for-ghana/">AI for Ghana</ArticleLink> for tools built with African
        users in mind.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/ghana-ai-future-opportunities-challenges/", label: "Ghana's AI future" },
          { href: "/blog/one-million-coders-ghana-tech-future/", label: "One Million Coders" },
          { href: "/blog/ai-tools-for-ghanaian-students-2026/", label: "AI tools for students" },
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
          title="Start building AI literacy today"
          description="GigaLearn and Giga3 AI Chat — learn responsibly with tools priced for Ghana."
          href="/gigalearn/"
          label="Explore GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AfricanYouthAiFutureJobsBody = { Body, plainText: PLAIN_TEXT };
