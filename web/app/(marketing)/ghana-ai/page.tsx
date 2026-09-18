"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  GraduationCap,
  Languages,
  MessageCircle,
  Palette,
  Play,
  Sparkles,
  Users,
  Video,
  Wallet,
  Wifi,
} from "lucide-react";
import { JsonLd, type FaqItem } from "@/components/seo/JsonLd";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/marketingPricing";

const PATH = "/ghana-ai";

const GHANA_RED = "#CE1126";
const GHANA_GOLD = "#FCD116";
const GHANA_GREEN = "#006B3F";

const LANGUAGES = ["Twi", "Ga", "Ewe", "Hausa", "Pidgin", "English"];

type PersonaId = "students" | "teachers" | "business" | "creators";

const PERSONAS: {
  id: PersonaId;
  label: string;
  icon: typeof GraduationCap;
  tagline: string;
  points: string[];
  cta: { href: string; label: string };
}[] = [
  {
    id: "students",
    label: "Students",
    icon: GraduationCap,
    tagline: "BECE, WASSCE and university study support in your language.",
    points: [
      "GigaLearn tutoring personas for JHS, SHS and university levels",
      "Practice questions, study plans and clear concept explanations",
      "Ask in Twi, Ga, Ewe, Hausa, Pidgin or English",
    ],
    cta: { href: "/ai-for-bece-wassce-ghana", label: "BECE & WASSCE prep" },
  },
  {
    id: "teachers",
    label: "Teachers",
    icon: BookOpen,
    tagline: "Lesson plans, quizzes and classroom materials in minutes.",
    points: [
      "Draft lesson outlines, objectives and discussion prompts",
      "Generate practice questions to review before class",
      "GigaLearn hand-off for focused student tutoring",
    ],
    cta: { href: "/ai-for-teachers-ghana", label: "AI for teachers" },
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    tagline: "Research, writing and automation billed in Ghana cedis.",
    points: [
      "Email drafts, proposals, research summaries and marketing copy",
      "Coding help for internal tools and scripts",
      "Paystack billing in GHS with Mobile Money support",
    ],
    cta: { href: "/ai-for-business-ghana", label: "AI for business" },
  },
  {
    id: "creators",
    label: "Creators",
    icon: Palette,
    tagline: "Create, edit and publish — then earn in GHS.",
    points: [
      "Media Studio images, Video AI clips and GigaEdit on-device editing",
      "Publish to the GigaSocial community from one account",
      "Sell digital products on Marketplace with Paystack checkout",
    ],
    cta: { href: "/gigasocial", label: "Join GigaSocial" },
  },
];

const TOOLS = [
  {
    icon: MessageCircle,
    title: "AI Chat",
    text: "Fast, Smart and Vision chat modes with African context and multi-provider failover.",
    href: "/chat",
    linkLabel: "Open chat",
  },
  {
    icon: GraduationCap,
    title: "GigaLearn",
    text: "AI tutor for BECE, WASSCE and beyond with practice modes and progress tracking.",
    href: "/gigalearn",
    linkLabel: "Start learning",
  },
  {
    icon: Video,
    title: "Video & Media Studio",
    text: "Generate video and images, add text overlays, then polish in GigaEdit.",
    href: "/ai-for-ghana",
    linkLabel: "Explore AI tools",
  },
  {
    icon: Users,
    title: "GigaSocial",
    text: "Ghana's AI community — publish, follow creators and join the conversation.",
    href: "/gigasocial",
    linkLabel: "Visit GigaSocial",
  },
  {
    icon: Wallet,
    title: "Marketplace",
    text: "Buy and sell digital products with secure Paystack checkout in Ghana cedis.",
    href: "/marketplace",
    linkLabel: "Browse marketplace",
  },
  {
    icon: Sparkles,
    title: "GHS Pricing",
    text: "Start free, upgrade with Mobile Money or card. No dollar card required.",
    href: "/pricing",
    linkLabel: "View pricing",
  },
];

const FAQ: FaqItem[] = [
  {
    question: "What is the Ghana AI Super App?",
    answer:
      "The Ghana AI Super App is Giga3AI — one platform combining AI chat, GigaLearn tutoring, video and image creation, GigaEdit, GigaSocial community and Marketplace, built in Ghana with GHS billing through Paystack.",
  },
  {
    question: "How does Giga3AI help BECE and WASSCE students?",
    answer:
      "GigaLearn on Giga3AI gives JHS and SHS students AI tutoring, practice questions, study plans and clear explanations for BECE and WASSCE revision. It is a study aid that supports classroom learning — always verify answers with teachers and syllabus materials.",
  },
  {
    question: "Which Ghanaian languages does Giga3AI support?",
    answer:
      "Giga3AI supports Twi, Ga, Ewe, Hausa, Ghanaian Pidgin and English across chat and African voice readers, so students, teachers and businesses can ask questions in the language they think in.",
  },
  {
    question: "How much does Giga3AI cost in Ghana?",
    answer:
      "Giga3AI has a Free plan at GHS 0 with 25 starter credits. Paid plans bill in Ghana cedis through Paystack: Basic at GHS 60 per month with 100 credits, Pro at GHS 150 per month with 250 credits, and Premium at GHS 350 per month with 500 credits. Mobile Money, cards and bank transfer are supported.",
  },
  {
    question: "Can teachers use Giga3AI for lesson plans?",
    answer:
      "Yes. Teachers use Giga3AI chat to draft lesson outlines, learning objectives, quizzes and classroom materials, then review everything before class. GigaLearn adds structured tutoring support for students. Giga3AI is an independent platform and is not affiliated with GES or WAEC.",
  },
  {
    question: "Is Giga3AI an official GES or WAEC product?",
    answer:
      "No. Giga3AI is an independent platform built in Ghana. It supports teaching, learning and business workflows, but it is not affiliated with GES, WAEC or any government examination body unless a verified partnership is announced.",
  },
];

const PLANS = (["basic", "pro", "premium"] as const).map((id) => ({
  id,
  name: SUBSCRIPTION_PLANS[id].label,
  price: SUBSCRIPTION_PLANS[id].priceGhs,
  credits: SUBSCRIPTION_PLANS[id].credits,
  popular: id === "pro",
}));

export default function GhanaAiPage() {
  const [persona, setPersona] = useState<PersonaId>("students");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const active = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];
  const ActiveIcon = active.icon;

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Ghana AI Super App", path: PATH },
        ]}
      />
      <JsonLd faq={FAQ} />

      {/* Hero — Ghana colours on deep navy */}
      <section className="bg-[#0A1931] text-white">
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(to right, ${GHANA_RED} 0%, ${GHANA_RED} 33%, ${GHANA_GOLD} 33%, ${GHANA_GOLD} 66%, ${GHANA_GREEN} 66%, ${GHANA_GREEN} 100%)`,
          }}
        />
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-12 text-center sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
            <Sparkles className="h-4 w-4" style={{ color: GHANA_GOLD }} aria-hidden />
            Built in Ghana · Powered by AI
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Ghana AI Super App — <span style={{ color: GHANA_GOLD }}>Giga3AI</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            Ghana&apos;s #1 AI platform for BECE, WASSCE &amp; beyond. Chat, learn, create
            video and grow business — with Twi, Ga, Ewe and Pidgin support, and billing in
            Ghana cedis.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/chat"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-bold text-black"
              style={{ backgroundColor: GHANA_GOLD }}
            >
              <Play className="h-5 w-5" aria-hidden />
              Start free — {FREE_STARTER_CREDITS} credits
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/30 px-7 py-3 text-base font-bold text-white hover:border-white/60"
            >
              View GHS pricing
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
            role="group"
            aria-label="Supported languages"
          >
            <Languages className="h-4 w-4 text-slate-400" aria-hidden />
            {LANGUAGES.map((lang) => (
              <span
                key={lang}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: Wallet,
              title: "Pay in cedis",
              text: "Paystack billing in GHS — Mobile Money, cards and bank transfer.",
            },
            {
              icon: Wifi,
              title: "Works on 3G",
              text: "Lightweight PWA that installs on your phone and sips data.",
            },
            {
              icon: Languages,
              title: "Local languages",
              text: "African voices and chat support for Twi, Ga, Ewe, Hausa and Pidgin.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${GHANA_GREEN}1A`, color: GHANA_GREEN }}
              >
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-sm leading-snug text-slate-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Persona switcher */}
      <section className="bg-slate-50" aria-label="Choose your path">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            One super app, built for every Ghanaian
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600">
            Pick who you are — Giga3AI adapts to students, teachers, businesses and
            creators.
          </p>
          <div
            className="mt-8 flex flex-wrap justify-center gap-2"
            role="group"
            aria-label="Personas"
          >
            {PERSONAS.map((p) => {
              const selected = p.id === persona;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  aria-pressed={selected}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors"
                  style={
                    selected
                      ? { backgroundColor: GHANA_GOLD, color: "#000" }
                      : { backgroundColor: "#fff", color: "#334155", border: "1px solid #E2E8F0" }
                  }
                >
                  <p.icon className="h-4 w-4" aria-hidden />
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-6 max-w-3xl rounded-3xl bg-[#0A1931] p-8 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: GHANA_GOLD, color: "#000" }}
              >
                <ActiveIcon className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-xl font-extrabold">For {active.label}</h3>
                <p className="text-sm text-slate-300">{active.tagline}</p>
              </div>
            </div>
            <ul className="mt-5 space-y-2.5">
              {active.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[15px] text-slate-200">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: GHANA_GOLD }} aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href={active.cta.href}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-black"
              style={{ backgroundColor: GHANA_GOLD }}
            >
              {active.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Everything Ghana needs, in one app
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600">
            Stop juggling five subscriptions. Giga3AI links chat, learning, creation,
            community and commerce under one account.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.map((tool) => (
              <div
                key={tool.title}
                className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${GHANA_RED}14`, color: GHANA_RED }}
                >
                  <tool.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">{tool.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{tool.text}</p>
                <Link
                  href={tool.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: GHANA_GREEN }}
                >
                  {tool.linkLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BECE / WASSCE band */}
      <section className="text-white" style={{ backgroundColor: GHANA_GREEN }}>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-white/15">
              <GraduationCap className="h-7 w-7" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Pass BECE &amp; WASSCE with an AI study partner
              </h2>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-emerald-50">
                GigaLearn tutors JHS and SHS students through practice questions, study
                plans and simple explanations — in English or your Ghanaian language.
                Free to start, with GHS plans when you need more.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/ai-for-bece-wassce-ghana"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-base font-bold"
              style={{ color: GHANA_GREEN }}
            >
              BECE &amp; WASSCE prep guide
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              href="/ai-tools-for-students-ghana"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/40 px-7 py-3 text-base font-bold text-white hover:border-white"
            >
              AI tools for students
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Honest pricing in Ghana cedis
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600">
            Start free with {FREE_STARTER_CREDITS} credits. Upgrade with Mobile Money,
            card or bank transfer via Paystack. 1 GHS = 1 credit top-ups available.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className="relative flex flex-col rounded-3xl border-2 bg-white p-6 text-center"
                style={{ borderColor: plan.popular ? GHANA_GOLD : "#E2E8F0" }}
              >
                {plan.popular ? (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-black"
                    style={{ backgroundColor: GHANA_GOLD }}
                  >
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  GH₵{plan.price}
                  <span className="text-sm font-semibold text-slate-500">/month</span>
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: GHANA_GREEN }}>
                  {plan.credits} credits / month
                </p>
                <Link
                  href="/pricing"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-white"
                  style={{ backgroundColor: plan.popular ? GHANA_RED : "#0A1931" }}
                >
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Free plan at GH₵0 with {FREE_STARTER_CREDITS} starter credits ·{" "}
            <Link href="/pricing" className="font-bold underline" style={{ color: GHANA_GREEN }}>
              Compare all plans
            </Link>
          </p>
        </div>
      </section>

      {/* Ghana cluster links */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Guides for Ghana
          </h2>
          <nav
            className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2"
            aria-label="Ghana guides"
          >
            {[
              { href: "/ai-for-ghana", label: "AI for Ghana overview" },
              { href: "/ai-tools-for-students-ghana", label: "AI tools for students in Ghana" },
              { href: "/ai-for-bece-wassce-ghana", label: "AI for BECE & WASSCE preparation" },
              { href: "/ai-for-teachers-ghana", label: "AI for teachers in Ghana" },
              { href: "/ai-for-business-ghana", label: "AI tools for Ghanaian businesses" },
              { href: "/gigalearn", label: "GigaLearn — AI tutor" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-12 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-[15px] font-bold text-slate-900 hover:border-slate-300 hover:bg-slate-100"
              >
                {link.label}
                <ArrowRight
                  className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: GHANA_RED }}
                  aria-hidden
                />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Ghana AI questions, answered
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-[15px] font-bold text-slate-900">{item.question}</span>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                      style={{
                        backgroundColor: open ? GHANA_GOLD : "#F1F5F9",
                        color: open ? "#000" : "#475569",
                      }}
                      aria-hidden
                    >
                      {open ? "−" : "+"}
                    </span>
                  </button>
                  {open ? (
                    <p className="px-5 pb-5 text-[15px] leading-relaxed text-slate-600">
                      {item.answer}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-3xl bg-[#0A1931] p-8 text-center text-white">
            <MessageCircle className="mx-auto h-10 w-10" style={{ color: GHANA_GOLD }} aria-hidden />
            <h3 className="mt-3 text-xl font-extrabold">Medase — ready to start?</h3>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-slate-300">
              Join thousands of Ghanaians using Giga3AI for school, work and creativity.
              Free to try, in your language.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/chat"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3 text-base font-bold text-black"
                style={{ backgroundColor: GHANA_GOLD }}
              >
                Chat free now
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/gigalearn"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/30 px-7 py-3 text-base font-bold text-white hover:border-white/60"
              >
                Open GigaLearn
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
