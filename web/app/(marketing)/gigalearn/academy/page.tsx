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

const quickTools = [
  { title: "Teacher Pace", description: "Education tools and academic writing.", href: "/documents/", pictogram: "👩🏽‍🏫", color: "#164cc9" },
  { title: "Creators", description: "Create and share original content.", href: "/creator-studio/", pictogram: "🎬", color: "#b94c06" },
  { title: "Business Tools", description: "Plan, write and grow your business.", href: "/documents/", pictogram: "📈", color: "#08783b" },
] as const;

function QuickTools() {
  return (
    <nav aria-label="Teacher, creator and business tools" className="mx-auto max-w-3xl px-3 pt-4 sm:px-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {quickTools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="flex min-w-0 flex-col items-center rounded-2xl px-2 py-4 text-center shadow-md focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:px-4"
            style={{ backgroundColor: tool.color, color: "#ffffff" }}
          >
            <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 text-4xl sm:h-20 sm:w-20 sm:text-5xl">{tool.pictogram}</span>
            <span className="mt-2 text-sm font-extrabold leading-tight sm:text-lg" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>{tool.title}</span>
            <span className="mt-2 flex-1 text-xs font-medium leading-snug sm:text-sm" style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff" }}>{tool.description}</span>
            <span aria-hidden="true" className="mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-violet-800"><ArrowRight className="h-5 w-5" /></span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function LearnDestinations() {
  return (
    <nav aria-label="GigaLearn learning destinations" className="mx-auto max-w-3xl space-y-3 px-3 pt-4 pb-5 sm:px-6">
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
      <QuickTools />
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
