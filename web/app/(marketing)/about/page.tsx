import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { GIGA3_VISION } from "@/lib/vision";
import { GEO_POSITIONING_STATEMENT, siteConfig } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata: Metadata = publicMetadata({
  path: "/about",
  title: "About Giga3 AI",
  description:
    "Giga3 AI is an AI platform built in Ghana for learning, research, coding and creativity — designed for students, creators and businesses worldwide.",
});

const TECH_STACK = [
  { name: "Next.js PWA", detail: "Static export on Cloudflare Pages; installable, offline-aware shell" },
  { name: "Convex", detail: "Realtime backend — functions, scheduling, file storage and crons" },
  { name: "Multi-provider AI", detail: "Server-side failover chain: OpenAI → Gemini → OpenRouter (via fal.ai)" },
  { name: "Media providers", detail: "fal.ai and Replicate (Seedance) for image and video; Google AI Studio backup" },
  { name: "Paystack", detail: "Billing in Ghanaian cedis (GHS): cards, mobile money, bank" },
  { name: "Supabase (optional)", detail: "Alternate chat/media history backend" },
];

export default function AboutPage() {
  return (
    <>
    <JsonLd
      breadcrumbs={[
        { name: "Giga3 AI", path: "/" },
        { name: "About", path: "/about" },
      ]}
    />
    <div className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <BrandLogo size={48} />
            <div>
              <h1 className="page-title">About {siteConfig.name}</h1>
              <VisionTagline className="mt-2" />
            </div>
          </div>

          <p className="section-lead mt-8">{GIGA3_VISION.mission}</p>

          <div className="mt-10 space-y-6 text-base leading-relaxed text-muted">
            <p>
              {siteConfig.name} is an advanced artificial intelligence platform from Ghana for learning,
              research, coding, creativity, productivity, content creation, and problem-solving.
            </p>
            <p>
              Designed and founded by{" "}
              <strong className="text-foreground">
                {siteConfig.founder.name} ({siteConfig.founder.alias})
              </strong>
              , {siteConfig.founder.role} from {siteConfig.founder.location} — {siteConfig.founder.organization}.
            </p>
            <p>
              From chat and media studios to GigaLearn, GigaSocial, Marketplace, and Enterprise
              workspaces, Giga3 delivers one unified ecosystem for individuals, creators, educators,
              and organizations across Africa and beyond.
            </p>
          </div>

          <section className="mt-10 rounded-2xl border border-border bg-slate-50 p-5" aria-labelledby="about-positioning">
            <h2 id="about-positioning" className="text-base font-semibold text-foreground">What Giga3 AI does</h2>
            <p className="mt-2 text-base leading-relaxed text-muted" data-testid="geo-positioning">
              {GEO_POSITIONING_STATEMENT}
            </p>
          </section>

          <section className="mt-10" aria-labelledby="about-facts">
            <h2 id="about-facts" className="text-base font-semibold text-foreground">Company facts</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <dt className="text-muted">Founder</dt>
                <dd className="font-medium text-foreground">{siteConfig.founder.name} ({siteConfig.founder.alias})</dd>
              </div>
              <div className="rounded-xl border border-border p-4">
                <dt className="text-muted">Location</dt>
                <dd className="font-medium text-foreground">{siteConfig.founder.location}, Africa</dd>
              </div>
              <div className="rounded-xl border border-border p-4">
                <dt className="text-muted">Organisation</dt>
                <dd className="font-medium text-foreground">{siteConfig.founder.organization}</dd>
              </div>
              <div className="rounded-xl border border-border p-4">
                <dt className="text-muted">Contact</dt>
                <dd className="font-medium text-foreground">
                  <a href={`mailto:${siteConfig.contact.email}`} className="text-accent underline">
                    {siteConfig.contact.email}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-10" aria-labelledby="about-stack">
            <h2 id="about-stack" className="text-base font-semibold text-foreground">Technology</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {TECH_STACK.map((item) => (
                <li key={item.name} className="rounded-xl border border-border p-4 text-sm">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 text-muted">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Built in Africa", desc: "Rooted in Ghana, designed for global scale" },
              { title: "Powered by AI", desc: "Multi-provider failover and intelligent assistance" },
              { title: "Designed for Everyone", desc: "Students, creators, businesses, and enterprises" },
            ].map((item) => (
              <div key={item.title} className="saas-card rounded-2xl p-5 text-center">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm text-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
    </>
  );
}
