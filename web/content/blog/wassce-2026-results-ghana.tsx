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
  { id: "results-release", label: "What was released" },
  { id: "check-results", label: "How to check results" },
  { id: "understand-grades", label: "Understanding grades" },
  { id: "next-steps", label: "Next steps after results" },
  { id: "irregularities", label: "Withheld or cancelled results" },
  { id: "ai-support", label: "How AI can support learning" },
] as const;

export const PLAIN_TEXT = `
WASSCE 2026 provisional results released September WAEC Ghana 512862 candidates.
Check results online waecdirect index number voucher PIN serial number.
Understanding grades A1 to F9 core subjects English Maths Science Social Studies.
Next steps tertiary education resits private candidates university polytechnic.
Withheld cancelled results irregularities investigation October 2026.
AI study support GigaLearn practice questions revision plans responsible use.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        The West African Examinations Council (WAEC) released the{" "}
        <strong>provisional WASSCE 2026 results</strong> for school candidates in Ghana on 5 September
        2026. If you are a student, parent, or teacher, this guide explains what that means, how to
        check results safely, and what to do next — without guessing at policies WAEC has not
        published.
      </Prose>

      <ArticleH2 id="results-release">What was released</ArticleH2>
      <Prose>
        According to WAEC and reputable Ghanaian news reports,{" "}
        <strong>512,862 candidates</strong> from 1,022 schools entered the 2026 WASSCE for School
        Candidates — an increase compared with 2025 entries. These figures come from WAEC&apos;s
        provisional release announcement; final statistics may be updated after investigations
        conclude.
      </Prose>
      <Prose>
        WAEC also reported that some results were cancelled or withheld due to examination
        irregularities, with decisions on certain withheld cases expected by late October 2026. Treat
        any social media screenshot of &quot;full pass rates&quot; as unverified until you confirm
        it on official channels.
      </Prose>

      <ArticleH2 id="check-results">How to check results</ArticleH2>
      <Prose>
        Individual candidates can check results through WAEC Ghana&apos;s official result-checking
        portal. You will typically need:
      </Prose>
      <BulletList
        items={[
          "Your 9-digit Index Number exactly as printed on your exam documents.",
          "Examination type set to WASSCE (May/June).",
          "Examination year set to 2026.",
          "A results-checking scratch card with Serial Number and 12-digit PIN.",
        ]}
      />
      <Prose>
        School heads receive separate login credentials for bulk access. Always use official WAEC
        websites — not third-party &quot;result upgrade&quot; services. WAEC has warned the public
        against fraudsters who claim they can change grades for money.
      </Prose>

      <ArticleH2 id="understand-grades">Understanding grades</ArticleH2>
      <Prose>
        WASSCE uses grades from <strong>A1 (excellent)</strong> through <strong>F9 (fail)</strong>.
        Core subjects — English Language, Core Mathematics, Integrated Science, and Social Studies
        — are especially important for many tertiary programmes. Elective subjects matter too, but
        requirements vary by institution.
      </Prose>
      <ArticleH3>Common questions</ArticleH3>
      <BulletList
        items={[
          "A1–C6 is generally considered a credit pass for many programmes; D7–E8 may qualify for some paths; F9 is a fail.",
          "Aggregate calculations depend on the programme you apply to — check each university or college requirement.",
          "Provisional results may change if investigations alter your status.",
        ]}
      />

      <ArticleH2 id="next-steps">Next steps after results</ArticleH2>
      <Prose>
        Strong results open doors to universities, colleges of education, nursing training, and
        technical programmes. Weaker results are not the end — resit options, vocational training,
        and skill-building paths remain available. Speak with your school&apos;s guidance unit before
        making major decisions.
      </Prose>
      <BulletList
        items={[
          "Research admission requirements on each institution's official website.",
          "Keep physical and digital copies of your results slip.",
          "If considering a resit, confirm current WAEC registration windows and fees.",
          "Explore digital skills alongside academic paths — see our guide on One Million Coders.",
        ]}
      />

      <ArticleH2 id="irregularities">Withheld or cancelled results</ArticleH2>
      <Prose>
        If your result is withheld or a subject is cancelled, follow instructions from your school
        and WAEC. Do not pay unofficial agents who promise to &quot;release&quot; results. WAEC
        investigates irregularities through formal processes; outcomes are communicated through
        official channels.
      </Prose>

      <ArticleH2 id="ai-support">How AI can support learning</ArticleH2>
      <Prose>
        Whether you are celebrating, planning a resit, or preparing for the next academic year, AI
        can help with <em>learning</em> — not with altering official results. Use tools like{" "}
        <ArticleLink href="/gigalearn/">GigaLearn</ArticleLink> and{" "}
        <ArticleLink href="/chat/login/">Giga3 AI Chat</ArticleLink> to generate practice
        questions, explain difficult topics, and build revision plans. Read our dedicated guides on{" "}
        <ArticleLink href="/blog/wassce-ai-study-guide/">WASSCE + AI</ArticleLink> and{" "}
        <ArticleLink href="/blog/ai-tools-for-ghanaian-students-2026/">
          AI tools for Ghanaian students
        </ArticleLink>.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/wassce-ai-study-guide/", label: "WASSCE + AI study guide" },
          { href: "/blog/ai-for-bece-wassce-preparation-ghana/", label: "AI for BECE & WASSCE prep" },
          { href: "/gigalearn/", label: "GigaLearn — structured learning" },
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
          title="Plan your next study steps with GigaLearn"
          description="Structured explanations, practice questions, and revision support — built for Ghanaian students."
          href="/gigalearn/"
          label="Explore GigaLearn"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const Wassce2026ResultsGhanaBody = { Body, plainText: PLAIN_TEXT };
