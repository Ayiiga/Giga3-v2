import { academyCourses, courseSchema } from "@/lib/seo/academyCourses.mjs";

export function AcademyCourseDirectory() {
  const schema = { "@context": "https://schema.org", "@type": "ItemList", itemListElement:
    academyCourses.map((course, index) => ({ "@type": "ListItem", position: index + 1, item: courseSchema(course) })) };
  return <section aria-labelledby="practical-courses-title" className="mx-auto max-w-6xl px-4 py-8">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <h2 id="practical-courses-title" className="text-2xl font-bold">Practical courses at GigaLearn Academy</h2>
    <p className="mt-3 leading-7">Learn AI, build a website or mobile app, explore robotics, strengthen digital skills or improve your teaching. Each course has ten lessons with explanations, worked examples and practical activities. Start with the fundamentals and build towards a useful project.</p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {academyCourses.map(course => <article key={course.id} className="rounded-2xl border border-violet-200 bg-white p-5 text-slate-900">
        <p className="text-sm font-semibold text-violet-700">10 lessons · Practical learning</p>
        <h3 className="mt-2 text-xl font-bold"><a className="underline underline-offset-4" href={course.href}>{course.name}</a></h3>
        <p className="mt-3 leading-6">{course.summary}</p>
        <a className="mt-4 inline-flex min-h-11 items-center font-semibold text-violet-800 underline" href={course.href}>View course and lesson outline</a>
      </article>)}
    </div>
    <p className="mt-5 leading-7">Workspace lessons are free to study. External tools, devices, hosting or AI usage may have separate costs. Workspace progress and completion certificates are stored in your browser; they are not an accredited qualification or evidence of instructor review.</p>
    <nav aria-label="Learning options" className="mt-4 flex flex-wrap gap-5">
      <a className="underline" href="/gigalearn/academy/workspace/">Open the learning workspace</a>
      <a className="underline" href="/gigalearn/exam/">BECE, WASSCE and teacher promotion exam practice</a>
    </nav>
  </section>;
}
