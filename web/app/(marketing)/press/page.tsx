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
  ["/gigalearn", "/media", "/gigaedit", "/gigasocial", "/marketplace", "/creator-studio"].includes(
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
              <h2 className="text-lg font-semibold text-foreground">Press releases</h2>
              <p className="text-base leading-relaxed text-muted">
                Formal press releases will be listed here as they are published. For now, see product
                updates on the{" "}
                <Link href="/blog/" className="text-accent underline">
                  Giga3 AI Blog
                </Link>
                .
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
              </ul>
            </section>
          </article>
        </Container>
      </div>
    </>
  );
}
