import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { EDUCATION_GUIDES } from "@/lib/seo/educationGuides";
import { publicMetadata } from "@/lib/seo/publicMetadata";
export const metadata = publicMetadata({
  path: "/study-guides",
  title: "Free BECE, WASSCE and Teacher Study Guides | Giga3 AI",
  description:
    "Browse 30 free Ghana-focused BECE, WASSCE and teacher revision guides with worked examples, explanations and practical study tips.",
});
export default function StudyGuidesIndex() {
  const subjects = Array.from(
    new Set(EDUCATION_GUIDES.map((guide) => guide.subject)),
  );
  return (
    <main className="marketing-stable bg-white text-slate-900">
      <JsonLd
        webPage={{
          path: "/study-guides",
          name: "Free Ghana Study Guides",
          description:
            "Thirty worked BECE, WASSCE and teacher revision guides.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Study guides", path: "/study-guides" },
        ]}
      />
      <div className="mx-auto max-w-4xl px-5 py-12 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Free Ghana Study Guides
        </h1>
        <p className="mt-4 text-lg">
          Explore 30 original revision guides for BECE, WASSCE and classroom
          teaching. Each guide has a worked explanation, practice activity and
          revision tip.
        </p>
        {subjects.map((subject) => (
          <section className="mt-10" key={subject}>
            <h2 className="text-2xl font-semibold">{subject}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {EDUCATION_GUIDES.filter(
                (guide) => guide.subject === subject,
              ).map((guide) => (
                <li key={guide.slug}>
                  <Link
                    className="block rounded-lg border border-slate-200 p-4 text-emerald-800 underline"
                    href={`/study-guides/${guide.slug}/`}
                  >
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p className="mt-10 text-sm">
          Independent revision resources; not official WAEC past questions.
        </p>
      </div>
    </main>
  );
}
