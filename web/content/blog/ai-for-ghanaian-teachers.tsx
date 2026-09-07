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
  { id: "lesson-planning", label: "Lesson planning" },
  { id: "worksheets-quizzes", label: "Worksheets and quizzes" },
  { id: "differentiation", label: "Differentiated learning" },
  { id: "marking", label: "Marking assistance" },
  { id: "activities", label: "Classroom activities" },
  { id: "revision", label: "BECE & WASSCE revision" },
  { id: "communication", label: "Parent communication" },
  { id: "admin", label: "Administrative tasks" },
  { id: "review-output", label: "Always review AI output" },
] as const;

export const PLAIN_TEXT = `
Ghanaian teachers AI lesson planning worksheets quizzes differentiated learning marking classroom activities.
BECE WASSCE revision exercises parent communication administrative tasks basic schools JHS.
Review AI output accuracy curriculum Ghana Education Service responsible classroom use GigaLearn.
`.trim();

function ArticleContent() {
  return (
    <>
      <Prose>
        Ghanaian teachers — from primary classrooms in Tamale to JHS blocks in Accra — carry heavy
        workloads. <strong>AI can save hours</strong> on planning and admin when used as a draft
        assistant, not an unquestioned authority. Every output must be reviewed for accuracy,
        cultural fit, and curriculum alignment.
      </Prose>

      <ArticleH2 id="lesson-planning">Lesson planning</ArticleH2>
      <Prose>
        Prompt AI with your class level, subject, topic, and time available. Ask for objectives,
        starter activities, main teaching points, and plenary questions aligned to Ghana Education
        Service expectations. Edit the plan to match your pupils&apos; prior knowledge.
      </Prose>
      <BulletList
        items={[
          "Example: 'JHS 2 Integrated Science — photosynthesis, 40 minutes, include a practical demo idea.'",
          "Example: 'Primary 4 English — comprehension on community helpers, include Ghanaian context.'",
        ]}
      />

      <ArticleH2 id="worksheets-quizzes">Worksheets and quizzes</ArticleH2>
      <Prose>
        Generate differentiated worksheets and short quizzes in minutes. Export to print or share via
        WhatsApp for homework — but check every question against your scheme of learning.
      </Prose>

      <ArticleH2 id="differentiation">Differentiated learning</ArticleH2>
      <Prose>
        Ask AI for three versions of the same task: support, core, and extension. This helps mixed-
        ability classes common in Ghanaian basic schools without tripling your prep time.
      </Prose>

      <ArticleH2 id="marking">Marking assistance</ArticleH2>
      <Prose>
        AI can suggest rubrics and sample feedback comments for essays and structured responses. You
        remain the examiner — never outsource final grades blindly.
      </Prose>

      <ArticleH2 id="activities">Classroom activities</ArticleH2>
      <Prose>
        Brainstorm group work, role plays, and low-resource experiments. Request activities that work
        without expensive kits — important for schools with limited materials.
      </Prose>

      <ArticleH2 id="revision">BECE &amp; WASSCE revision</ArticleH2>
      <Prose>
        Create revision booklets, timed practice, and topic checklists for BECE and WASSCE classes.
        Cross-reference with{" "}
        <ArticleLink href="/blog/ai-for-bece-wassce-preparation-ghana/">
          our BECE &amp; WASSCE AI guide
        </ArticleLink>{" "}
        and share responsible-study habits with pupils via{" "}
        <ArticleLink href="/blog/wassce-ai-study-guide/">WASSCE + AI</ArticleLink>.
      </Prose>

      <ArticleH2 id="communication">Parent communication</ArticleH2>
      <Prose>
        Draft termly letters, meeting agendas, and SMS-friendly updates in clear English (or
        bilingual drafts you translate). Personalise before sending.
      </Prose>

      <ArticleH2 id="admin">Administrative tasks</ArticleH2>
      <Prose>
        Summarise meeting notes, organise duty rosters, and draft scheme-of-work tables. Use{" "}
        <ArticleLink href="/chat/login/">Giga3 AI Chat</ArticleLink> for quick document structuring.
      </Prose>

      <ArticleH2 id="review-output">Always review AI output</ArticleH2>
      <BulletList
        items={[
          "Check facts — AI can invent historical dates and scientific claims.",
          "Match language level to your pupils.",
          "Avoid bias and stereotypes in examples.",
          "Do not share pupil personal data in prompts.",
          "Teach students that AI is a tool you supervise, not a replacement for you.",
        ]}
      />

      <RelatedReading
        links={[
          { href: "/blog/ai-tools-for-ghanaian-students-2026/", label: "AI tools for students" },
          { href: "/blog/wassce-ai-study-guide/", label: "WASSCE + AI study guide" },
          { href: "/gigalearn/", label: "GigaLearn for structured learning" },
          { href: "/enterprise/", label: "Enterprise & Education" },
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
          title="Save prep time with Giga3 AI"
          description="Draft lesson plans, quizzes, and parent letters — then review and teach with confidence."
          href="/chat/login/"
          label="Try Giga3 AI"
        />
      }
    >
      <ArticleContent />
    </BlogArticleLayout>
  );
}

export const AiForGhanaianTeachersBody = { Body, plainText: PLAIN_TEXT };
