import { AcademyCourseDirectory } from "@/components/seo/AcademyCourseDirectory";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const loading = <p className="text-sm text-muted" role="status">Loading GigaLearn Academy…</p>;

const AcademyHomeRoot = dynamic(
  () =>
    import("@/components/gigalearn/academy/AcademyPageRoots").then((m) => ({
      default: m.AcademyHomeRoot,
    })),
  {
    ssr: false,
    loading: () => loading,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn/academy",
  title: "GigaLearn Academy — Learn by Doing | Giga3 AI",
  description:
    "Practical AI, Web & PWA, mobile app, robotics, digital skills and teaching courses. Explore ten-lesson outlines and build useful projects with GigaLearn Academy.",
});


const learnDestinations = [
  { title: "GigaLearn Academy (Workspace)", subtitle: "Learn by doing. Explore courses and track your progress.", href: "/gigalearn/academy/workspace/", illustration: "🎓", background: "#1459c7" },
  { title: "Education and Business Tools", subtitle: "Writing, research, documents and business plans.", href: "/documents/", illustration: "📚", background: "#147d45" },
  { title: "Creators' Tools", subtitle: "Create and share original content.", href: "/creator-studio/", illustration: "🎬", background: "#a94c08" },
  { title: "Early Years (KG to Lower Primary)", subtitle: "Learn with objects, rhymes, stories and play.", href: "/gigalearn/?tab=early-years", illustration: "🧸", background: "#b52b73" },
  { title: "JHS, SHS and TLMs", subtitle: "Lessons, exam practice and teaching materials.", href: "/gigalearn/?tab=learn", illustration: "🔬", background: "#087889" },
  { title: "University", subtitle: "Advanced study, research and academic support.", href: "/gigalearn/?tab=learn", illustration: "🏛️", background: "#6334b6" },
] as const;

function LearnDestinations() {
  return (
    <nav aria-label="GigaLearn learning destinations" className="mx-auto max-w-3xl space-y-3 px-3 pt-4 pb-5 sm:px-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#5a16d7] to-[#8b36ed] px-5 py-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-widest text-white/90">Giga3 AI</p>
        <h2 className="mt-1 text-3xl font-extrabold">GigaLearn</h2>
        <p className="mt-1 text-lg font-semibold">Learn. Practice. Excel.</p>
        <p className="mt-2 text-sm text-white/95">Choose where you want to begin.</p>
      </div>
      {learnDestinations.map((item, index) => (
        <Link
          key={item.title}
          href={item.href}
          className="group flex min-h-[116px] items-center gap-3 rounded-3xl p-4 shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:gap-5 sm:p-5"
          style={{ backgroundColor: item.background, color: "#ffffff" }}
          data-testid={`learn-destination-${index + 1}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-violet-700 text-lg font-extrabold">{index + 1}</span>
          <span className="min-w-0 flex-1" style={{ color: "#ffffff" }}>
            <span className="block text-lg font-extrabold leading-tight sm:text-xl" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>{item.title}</span>
            <span className="mt-1 block text-sm font-medium leading-snug" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>{item.subtitle}</span>
          </span>
          <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-5xl sm:h-20 sm:w-20 sm:text-6xl">{item.illustration}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-violet-800 shadow-sm group-hover:translate-x-1 transition-transform" aria-hidden="true">
            <ArrowRight className="h-6 w-6" />
          </span>
        </Link>
      ))}
    </nav>
  );
}

export default function GigaLearnAcademyPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn/academy",
          name: "GigaLearn Academy",
          description:
            "Practical courses in AI, web and PWA development, mobile apps, robotics, digital skills and teaching.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
          { name: "Academy", path: "/gigalearn/academy" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaLearn Academy"
        description="Learn practical skills in AI, web and PWA development, mobile apps, robotics, digital technology and teaching."
        showProductNav={false}
      />
      <div className="px-3 pt-3 sm:px-6">
        <a
          href="/gigalearn/academy/workspace/"
          className="inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          Open Academy Workspace
        </a>
      </div>
      <LearnDestinations />
      <AcademyCourseDirectory />
      <div className="marketing-stable gigalearn-stable px-3 py-3 sm:px-6 sm:py-6">
        <Suspense fallback={loading}>
          <AcademyHomeRoot />
        </Suspense>
      </div>
    </>
  );
}
