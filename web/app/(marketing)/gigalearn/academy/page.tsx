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
  { title: "GigaLearn Academy (Workspace)", subtitle: "Learn by doing. Explore courses and track your progress.", href: "/gigalearn/academy/workspace/", art: "university", background: "from-[#1478ed] to-[#06b6ed]" },
  { title: "Education and Business Tools", subtitle: "Writing, research, documents and business plans.", href: "/documents/", art: "📝💼", background: "from-[#159b3a] to-[#7bdc12]" },
  { title: "Creators' Tools", subtitle: "Create and share original content.", href: "/creator-studio/", art: "🎬🎨", background: "from-[#ff9200] to-[#ffc12c]" },
  { title: "Early Years (KG to Lower Primary)", subtitle: "Learn with objects, rhymes, stories and play.", href: "/gigalearn/?tab=early-years", art: "🧸🔤", background: "from-[#ed299e] to-[#f875c3]" },
  { title: "JHS, SHS and TLMs", subtitle: "Lessons, exam practice and teaching materials.", href: "/gigalearn/?tab=learn", art: "📚🔬", background: "from-[#028fa8] to-[#16cbd4]" },
  { title: "University", subtitle: "Advanced study, research and academic support.", href: "/gigalearn/?tab=learn", art: "🎓📖", background: "from-[#7130da] to-[#a65af1]" },
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
          className={`group flex min-h-[112px] items-center gap-3 rounded-3xl bg-gradient-to-r ${item.background} p-4 text-white shadow-md transition-transform active:scale-[0.99] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:gap-5 sm:p-5`}
          data-testid={`learn-destination-${index + 1}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-violet-700 text-lg font-extrabold">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold leading-tight drop-shadow-sm sm:text-xl">{item.title}</span>
            <span className="mt-1 block text-sm font-medium leading-snug text-white drop-shadow-sm">{item.subtitle}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 64 64" className="h-12 w-12 shrink-0 drop-shadow-md sm:h-16 sm:w-16"><use href={`/images/gigalearn/learn-destinations.svg#${item.art}`} /></svg>
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
