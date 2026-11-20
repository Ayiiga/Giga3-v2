import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { JsonLd } from "@/components/seo/JsonLd";
import { PRODUCT_CATALOG } from "@/lib/seo/productCatalog";
import { GEO_POSITIONING_STATEMENT, siteConfig } from "@/lib/site";
import { GIGA3_VISION } from "@/lib/vision";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { brandingAssetUrl } from "@/lib/brandingAssets";

export const metadata = publicMetadata({
  path: "/press",
  title: "Giga3 AI Press Room — Media & Company Information",
  description:
    "Official Giga3 AI press information: company overview, founder, products, Ghana mission, logo assets and media contact for journalists and partners.",
});

const PRODUCT_HIGHLIGHTS = PRODUCT_CATALOG.filter((p) =>
  ["/gigalearn", "/gigalearn/academy/", "/gigalearn/exam/", "/gigasocial", "/marketplace", "/documents", "/creator-studio"].includes(
    p.href
  )
);

export default function PressPage() {
  const logoUrl = brandingAssetUrl("/images/logo.png");

  return (
    <>
      <JsonLd
        webPage={{
          path: "/press",
          name: "Giga3 AI Press Room",
          description:
            "Media information about Giga3 AI — Africa's AI Super App built in Ghana by Intelligence Global Arena (GIGA).",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Press", path: "/press" },
        ]}
      />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <article className="mx-auto max-w-3xl">
            <header>
              <h1 className="page-title">Giga3 AI Press Room</h1>
              <p className="section-lead mt-4">
                Official information for journalists, educators, partners and researchers covering
                Giga3 AI — Africa&apos;s AI Super App, built in Ghana.
              </p>
            </header>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">About Giga3 AI</h2>
              <p className="text-base leading-relaxed text-muted">{GEO_POSITIONING_STATEMENT}</p>
              <p className="text-base leading-relaxed text-muted">{GIGA3_VISION.mission}</p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Company description</h2>
              <p className="text-base leading-relaxed text-muted">
                {siteConfig.name} is an advanced artificial intelligence platform from Ghana for
                learning, research, coding, creativity, productivity, content creation, and
                problem-solving. It is designed and founded by {siteConfig.founder.name} (
                {siteConfig.founder.alias}), {siteConfig.founder.role} from {siteConfig.founder.location}{" "}
                — {siteConfig.founder.organization}.
              </p>
              <p className="text-base leading-relaxed text-muted">
                Consumer plans bill in Ghanaian cedis (GHS) through Paystack. The platform is delivered
                as a progressive web app (PWA) with multi-provider AI failover on the server.
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Founder</h2>
              <p className="text-base leading-relaxed text-muted">
                <strong className="text-foreground">{siteConfig.founder.name}</strong> (
                {siteConfig.founder.alias}) — {siteConfig.founder.role}, {siteConfig.founder.location}.
                Organisation: {siteConfig.founder.organization}.
              </p>
              <p className="text-sm text-muted">
                More context:{" "}
                <Link href="/about/" className="text-accent underline">
                  About Giga3 AI
                </Link>
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Giga3 AI products</h2>
              <ul className="space-y-3 text-sm text-muted">
                {PRODUCT_HIGHLIGHTS.map((product) => (
                  <li key={product.href} className="rounded-xl border border-border p-4">
                    <p className="font-semibold text-foreground">
                      <Link href={product.href} className="text-accent hover:underline">
                        {product.name}
                      </Link>
                    </p>
                    <p className="mt-1">{product.description}</p>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                Full product map:{" "}
                <Link href="/features/" className="text-accent underline">
                  Giga3 AI features
                </Link>
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">GigaLearn</h2>
              <p className="text-base leading-relaxed text-muted">
                GigaLearn is Giga3 AI&apos;s learning assistant for homework help, practice questions,
                study plans, and BECE and WASSCE revision support for JHS and SHS students in Ghana.
                It is a study aid — not an official WAEC or GES product.
              </p>
              <p className="text-sm text-muted">
                <Link href="/gigalearn/" className="text-accent underline">
                  GigaLearn product page
                </Link>
                {" · "}
                <Link href="/ai-for-bece-wassce-ghana/" className="text-accent underline">
                  BECE &amp; WASSCE preparation
                </Link>
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Ghana / Africa mission</h2>
              <p className="text-base leading-relaxed text-muted">
                {GIGA3_VISION.tagline}. Giga3 AI is built with Ghanaian billing, education context
                (including BECE and WASSCE study support), and mobile-first PWA access for learners,
                creators, and businesses across Africa and worldwide.
              </p>
              <p className="text-sm text-muted">
                <Link href="/ai-for-ghana/" className="text-accent underline">
                  AI for Ghana overview
                </Link>
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Official logo</h2>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-slate-50 p-5">
                <BrandLogo size={64} alt="Giga3 AI logo" />
                <div className="text-sm text-muted">
                  <p className="font-medium text-foreground">{siteConfig.name}</p>
                  <p className="mt-1 break-all">{logoUrl}</p>
                </div>
              </div>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Media contact</h2>
              <p className="text-base leading-relaxed text-muted">
                For press enquiries, partnerships, enterprise and education onboarding, or security
                disclosure, email{" "}
                <a href={`mailto:${siteConfig.contact.email}`} className="text-accent underline">
                  {siteConfig.contact.email}
                </a>
                .
              </p>
              <p className="text-sm text-muted">
                General contact:{" "}
                <Link href="/contact/" className="text-accent underline">
                  Contact Giga3 AI
                </Link>
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Review GigaLearn</h2>
              <p className="text-base leading-relaxed text-muted">Journalists, teachers and technology communities can try the public examples, follow the practice journey and share their findings. Include the date, device, subject and steps tested so readers can assess the experience.</p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                <li><Link href="/gigalearn/exam/bece/" className="text-accent underline">Try the BECE example and subject picker</Link></li>
                <li><Link href="/gigalearn/exam/wassce/" className="text-accent underline">Explore WASSCE core subject practice</Link></li>
                <li><Link href="/gigalearn/exam/promotion/" className="text-accent underline">Explore Teacher Promotion rank practice</Link></li>
                <li><Link href="/ai-for-teachers-ghana/" className="text-accent underline">Download a classroom lesson example</Link></li>
              </ul>
              <p className="text-sm text-muted">For a demonstration or questions about a feature, use the media contact above. Current prices and access conditions are on the <Link href="/pricing/" className="text-accent underline">pricing page</Link>.</p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Adoption and review context</h2>
              <p className="text-base leading-relaxed text-muted">
                As of 20 November 2026, Giga3 AI reports 117 registered accounts and 110 real
                users, with more than half of its real users being teachers. Teachers have been
                reviewing and providing feedback on GigaLearn, helping guide product improvements.
              </p>
              <p className="text-sm leading-relaxed text-muted">
                These are founder-reported figures, not independently audited usage totals.
                A public directory listing or a teacher review does not constitute endorsement by
                WAEC, GES, a government agency or the directory provider.
              </p>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Official website &amp; profiles</h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
                <li>
                  Website:{" "}
                  <a href={siteConfig.url} className="text-accent underline">
                    {siteConfig.url}
                  </a>
                </li>
                <li>
                  GitHub:{" "}
                  <a
                    href={siteConfig.links.github}
                    className="text-accent underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {siteConfig.links.github}
                  </a>
                </li>
                <li>Company directory profile: <a href={siteConfig.links.crunchbase} className="text-accent underline" target="_blank" rel="noopener noreferrer">Giga3 AI on Crunchbase</a></li>
                <li>Product directory profile: <a href={siteConfig.links.saashub} className="text-accent underline" target="_blank" rel="noopener noreferrer">Giga3 AI on SaaSHub</a></li>
                <li>African startup directory: <a href={siteConfig.links.startupListAfrica} className="text-accent underline" target="_blank" rel="noopener noreferrer">Giga3 AI on StartupList Africa</a></li>
              </ul>
              <p className="text-xs text-muted">Directory profiles include submitted product information. For current access conditions and prices, refer to the official product pages.</p>
            </section>
          </article>
        </Container>
      </div>
    </>
  );
}
