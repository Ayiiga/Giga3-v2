import { notFound } from "next/navigation";
import { academyCourses, courseSchema } from "@/lib/seo/academyCourses.mjs";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { JsonLd } from "@/components/seo/JsonLd";

export const dynamicParams = false;
export function generateStaticParams() { return academyCourses.map(course => ({ slug: course.slug })); }
function findCourse(slug: string) { return academyCourses.find(course => course.slug === slug); }
export function generateMetadata({ params }: { params: { slug: string } }) {
  const course = findCourse(params.slug);
  if (!course) notFound();
  return publicMetadata({ path: course.href, title: `${course.name} | GigaLearn`, description: course.summary });
}
export default function CoursePage({ params }: { params: { slug: string } }) {
  const course = findCourse(params.slug);
  if (!course) notFound();
  const schema = { "@context": "https://schema.org", ...courseSchema(course) };
  return <main className="marketing-stable mx-auto max-w-4xl px-4 py-8 text-foreground">
    <JsonLd breadcrumbs={[{ name: "Giga3 AI", path: "/" }, { name: "Academy", path: "/gigalearn/academy/" }, { name: "Courses", path: "/gigalearn/academy/courses/" }, { name: course.name, path: course.href }]} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <a href="/gigalearn/academy/courses/" className="underline">All Academy courses</a>
    <header className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-6 text-violet-950">
      <p className="font-semibold">GigaLearn Academy · 10 lessons</p>
      <h1 className="mt-2 text-3xl font-bold">{course.name}</h1>
      <p className="mt-4 leading-7">{course.summary}</p>
      <a href={course.startHref} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white">Start this course</a>
    </header>
    <section className="mt-8" aria-labelledby="course-outline"><h2 id="course-outline" className="text-2xl font-bold">What you will learn and practise</h2>
      <ol className="mt-5 space-y-4">{course.lessons.map((lesson, index) => <li key={lesson.title} className="rounded-xl border border-border p-5">
        <h3 className="text-lg font-semibold">{index + 1}. {lesson.title}</h3>
        <p className="mt-2 leading-7">{lesson.summary}</p>
        <p className="mt-3 leading-7"><strong>Practical activity:</strong> {lesson.activity}</p>
      </li>)}</ol>
    </section>
    <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-6 text-slate-900"><h2 className="text-2xl font-bold">Build evidence of your learning</h2>
      <p className="mt-3 leading-7">{course.project || "Create a useful AI-assisted deliverable. Include your prompt revisions, a verification log and your final human-edited result."}</p>
      <p className="mt-3 leading-7">Study the lessons, attempt the activities and complete the workspace checks. Workspace progress and completion certificates are browser-local. They are not an accredited qualification or confirmation of instructor review. Back up your work before clearing browser data.</p>
      <p className="mt-3 leading-7">Workspace lessons are free to study. External services, AI usage, equipment and hosting may have separate costs. Development courses require access to appropriate coding tools; robotics can begin with simulation.</p>
      <a href={course.startHref} className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet-800 underline">Open {course.name} lessons</a>
    </section>
  </main>;
}
