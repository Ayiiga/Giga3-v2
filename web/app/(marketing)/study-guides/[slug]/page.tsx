import { notFound } from "next/navigation";
import Link from "next/link";
import { EDUCATION_GUIDES } from "@/lib/seo/educationGuides";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export function generateStaticParams() {
  return EDUCATION_GUIDES.map(({ slug }) => ({ slug }));
}
export const dynamicParams = false;

export function generateMetadata({ params }: { params: { slug: string } }) {
  const guide = EDUCATION_GUIDES.find((item) => item.slug === params.slug);
  if (!guide) return {};
  return publicMetadata({
    path: `/study-guides/${guide.slug}`,
    title: `${guide.title} | Giga3 AI Ghana Study Guide`,
    description: `Learn ${guide.title} with a worked explanation, guided exercise and revision tip for Ghanaian learners and teachers.`,
  });
}

export default function StudyGuidePage({ params }: { params: { slug: string } }) {
  const guide = EDUCATION_GUIDES.find((item) => item.slug === params.slug);
  if (!guide) notFound();
  const related = EDUCATION_GUIDES.filter((item) => item.subject === guide.subject && item.slug !== guide.slug).slice(0, 4);
  return (
    <main className="marketing-stable bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="mb-6 text-sm"><Link href="/">Giga3 AI</Link> / <Link href="/study-guides/">Study guides</Link> / {guide.subject}</nav>
        <p className="mb-2 text-sm font-semibold text-emerald-700">{guide.subject} · Free revision resource</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-4 text-lg text-slate-700">A short, original worked example and guided practice for Ghanaian students and teachers.</p>
        <section className="mt-10"><h2 className="text-2xl font-semibold">Understand the idea</h2><p className="mt-3 leading-8">{guide.explanation}</p></section>
        <section className="mt-10"><h2 className="text-2xl font-semibold">Practice and check</h2><p className="mt-3 leading-8">{guide.exercise}</p></section>
        <section className="mt-10"><h2 className="text-2xl font-semibold">Revision tip</h2><p className="mt-3 leading-8">{guide.tip}</p></section>
        <p className="mt-8 rounded-lg border border-slate-200 p-4 text-sm">These are original revision examples, not verified past WAEC examination questions or official WAEC materials. Check your current syllabus and teacher guidance.</p>
        <div className="mt-8 flex flex-wrap gap-4"><Link className="rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white" href="/gigalearn/">Continue learning in GigaLearn</Link><Link className="rounded-lg border px-5 py-3" href="/study-guides/">Browse all guides</Link></div>
        {related.length > 0 && <section className="mt-12"><h2 className="text-xl font-semibold">Related study guides</h2><ul className="mt-4 space-y-3">{related.map((item) => <li key={item.slug}><Link className="text-emerald-800 underline" href={`/study-guides/${item.slug}/`}>{item.title}</Link></li>)}</ul></section>}
      </article>
    </main>
  );
}
