"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Card = {
  title: string;
  subtitle: string;
  image: string;
  gradient: string;
  href?: string;
  onClick?: () => void;
};

export function GigaLearnVisualHub({ openArea }: { openArea: (area: "student" | "teacher" | "create") => void }) {
  const cards: Card[] = [
    { title: "GigaLearn Academy (Workspace)", subtitle: "Explore courses and your learning workspace", image: "🎓", gradient: "from-[#087cfc] to-[#0058d5]", href: "/gigalearn/academy/" },
    { title: "Education and Business Tools", subtitle: "Writing, research, documents and business plans", image: "📝", gradient: "from-[#22b82d] to-[#75d900]", onClick: () => openArea("create") },
    { title: "Creators' Tools", subtitle: "Create content and explore creative tools", image: "🎬", gradient: "from-[#ff8d00] to-[#ffc128]", href: "/gigasocial/" },
    { title: "Early Years (KG to Lower Primary)", subtitle: "Play, learn and grow with familiar objects", image: "🧸", gradient: "from-[#ef278e] to-[#f65bb9]", onClick: () => openArea("student") },
    { title: "JHS, SHS and TLMs", subtitle: "Study guides, exam practice and learning materials", image: "📚", gradient: "from-[#00a9c3] to-[#04c8c2]", href: "/gigalearn/exam/" },
    { title: "University", subtitle: "Research, writing and advanced study support", image: "🎓", gradient: "from-[#6932de] to-[#943ef1]", onClick: () => openArea("teacher") },
  ];
  return (
    <section aria-label="Explore GigaLearn" className="space-y-3">
      <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#5511c8] via-[#7522e8] to-[#a65bfb] px-5 py-6 text-white shadow-md">
        <p className="text-xs font-bold uppercase tracking-widest text-white/85">Giga3 AI</p>
        <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">GigaLearn Academy</h2>
        <p className="mt-1 text-base font-bold">Learn. Practice. Excel.</p>
        <p className="mt-2 text-sm text-white/95">Your learning hub for every stage, from early years to university.</p>
      </div>
      <div className="grid gap-3">
        {cards.map((card, index) => {
          const body = (
            <>
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white/70 bg-[#5312c8] text-lg font-bold text-white">{index + 1}</span>
              <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15 text-4xl sm:h-16 sm:w-16">{card.image}</span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-base font-extrabold leading-tight text-white sm:text-xl">{card.title}</span>
                <span className="mt-1 block text-xs font-semibold leading-snug text-white/95 sm:text-sm">{card.subtitle}</span>
              </span>
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#5210bb]"><ArrowRight className="h-5 w-5" /></span>
            </>
          );
          const classes = `flex min-h-[108px] w-full items-center gap-3 rounded-[1.35rem] bg-gradient-to-r ${card.gradient} p-3.5 text-white shadow-sm transition-transform active:scale-[.99] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-purple-700 sm:gap-5 sm:p-5`;
          return card.href ? (
            <Link key={card.title} href={card.href} className={classes}>{body}</Link>
          ) : (
            <button key={card.title} type="button" onClick={card.onClick} className={classes}>{body}</button>
          );
        })}
      </div>
    </section>
  );
}
