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
  { id: "why-debate", label: "Why this debate matters" },
  { id: "verified-facts", label: "Verified facts" },
  { id: "reported-figures", label: "Reported figures" },
  { id: "questions-debated", label: "Questions being debated" },
  { id: "constructive-discussion", label: "Toward constructive discussion" },
] as const;

export const PLAIN_TEXT = `
Ghana wage debate minimum wage GH¢21.77 verified Fair Wages Salaries Commission 2026.
Reported MP basic salary GH¢60000 media analysts disputed political remuneration.
Public sector 9 percent increase Single Spine Salary Structure 2026.
Cost of living transparency accountability productivity public finances dignity workers.
Constructive non-partisan discussion fair wages Ghana.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghana is debating whether its wage system is fair. Headlines often pair a{" "}
        <strong>verified daily minimum wage of GH¢21.77</strong> with{" "}
        <strong>reported monthly political pay of around GH¢60,000</strong>. This article separates
        what is officially confirmed from what is reported or disputed — and invites constructive
        conversation about transparency, dignity, and public finances.
      </Prose>
      <Prose>
        We do not take a partisan position. The goal is clarity, not outrage — so citizens, workers,
        and policymakers can discuss fair compensation on shared facts.
      </Prose>

      <ArticleH2 id="why-debate">Why this debate matters</ArticleH2>
      <Prose>
        Wages shape daily life: rent, food, transport, school fees, and savings. When minimum
        earners and senior public officials appear to live in different economic worlds, people ask
        whether the system reflects productivity, accountability, and shared sacrifice — especially
        during periods of high living costs.
      </Prose>

      <ArticleH2 id="verified-facts">Verified facts</ArticleH2>
      <Prose>
        The following points are documented through official announcements and the Fair Wages and
        Salaries Commission (FWSC):
      </Prose>
      <BulletList
        items={[
          "The National Tripartite Committee agreed a 9% adjustment to Ghana's national daily minimum wage for 2026.",
          "The new daily minimum wage is GH¢21.77, effective 1 January to 31 December 2026 (up from GH¢19.97 in 2025).",
          "Public sector workers under the Single Spine Salary Structure also received a 9% base pay increase for 2026, per the November 2025 agreement between Government and Organised Labour.",
          "Employers must pay at least the legal minimum wage; non-compliance carries sanctions under the Labour Act.",
        ]}
      />
      <Prose>
        Source: FWSC and Ministry of Finance communiqués reported by Ghanaian news outlets in
        November 2025. Always confirm current rates on official government channels before making
        payroll decisions.
      </Prose>

      <ArticleH2 id="reported-figures">Reported figures</ArticleH2>
      <Prose>
        The <strong>GH¢60,000 monthly basic salary</strong> figure for Members of Parliament appears
        widely in Ghanaian media and analyst commentary in 2025–2026. It is typically described as{" "}
        <em>basic salary excluding allowances</em>, roughly double a previously reported figure of
        about GH¢30,000 through 2024.
      </Prose>
      <ArticleH3>Important qualification</ArticleH3>
      <Prose>
        We have <strong>not</strong> independently verified an official published payslip at
        GH¢60,000. This number is a <em>reported figure</em> from media analysis and public debate,
        not a line item on an FWSC minimum-wage communique. Treat it as part of the national
        conversation — not as uncontested fact.
      </Prose>
      <Prose>
        Analysts have also linked broader presidency compensation budget lines to salary-structure
        changes — another area where detailed public breakdowns remain limited. Transparency
        advocates argue that clearer, regularly published emoluments data would reduce speculation.
      </Prose>

      <ArticleH2 id="questions-debated">Questions being debated</ArticleH2>
      <BulletList
        items={[
          "Fairness: Should political and senior public pay grow faster than frontline workers' adjustments?",
          "Transparency: Should Article 71 office-holder pay be published in simpler, comparable formats?",
          "Productivity: What outcomes — in schools, clinics, and communities — justify pay gaps?",
          "Public finances: Can Ghana afford wide pay dispersion without cutting services or raising taxes?",
          "Cost of living: Does a 9% adjustment match real price pressures for low-wage workers?",
          "Dignity: Can minimum-wage earners live decently in major cities on daily rates?",
        ]}
      />
      <Prose>
        Political analysts from across the spectrum have questioned large percentage increases for
        MPs while teachers, nurses, and police receive smaller adjustments. Others argue
        institutional reform — such as an independent Public Emoluments Commission — could improve
        trust. These are <em>opinions and proposals</em>, not settled policy.
      </Prose>

      <ArticleH2 id="constructive-discussion">Toward constructive discussion</ArticleH2>
      <Prose>
        Productive wage debates ask: Who earns what, under what rules, with what evidence of
        service? They demand audit-friendly data, not viral screenshots. Workers deserve fair
        compensation; taxpayers deserve accountable spending; no party has a monopoly on either
        principle.
      </Prose>
      <Prose>
        Technology literacy also matters in this conversation.{" "}
        <ArticleLink href="/blog/ghana-ai-future-opportunities-challenges/">
          Ghana&apos;s AI future
        </ArticleLink>{" "}
        depends on skilled, fairly paid people in schools, hospitals, and startups — not only on
        headline-grabbing pay at the top. Explore{" "}
        <ArticleLink href="/blog/one-million-coders-ghana-tech-future/">
          One Million Coders
        </ArticleLink>{" "}
        for pathways into digital employment.
      </Prose>

      <RelatedReading
        links={[
          { href: "/blog/ghana-ai-future-opportunities-challenges/", label: "Ghana's AI future" },
          { href: "/blog/african-youth-ai-future-jobs/", label: "African youth and AI jobs" },
          { href: "/blog/one-million-coders-ghana-tech-future/", label: "One Million Coders programme" },
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
          title="Build skills for the digital economy"
          description="Fair wages and fair opportunity go together. Explore AI tools priced for Ghana."
          href="/ai-for-ghana/"
          label="AI for Ghana"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const GhanaWageSystemBody = { Body, plainText: PLAIN_TEXT };
