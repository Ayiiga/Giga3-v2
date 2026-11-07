import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, type FaqItem } from "@/components/seo/JsonLd";
import {
  ArticleH2,
  ArticleLink,
  FaqSection,
  Prose,
  RelatedReading,
} from "@/components/seo/SeoArticleParts";
import { PRODUCT_GROUPS, productsInGroup } from "@/lib/seo/productCatalog";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const PATH = "/features";

export const metadata = publicMetadata({
  path: PATH,
  title: "Giga3 Hub Features — Connected Tools for Learning, Work and Creativity",
  description:
    "Explore Giga3 Hub: Giga3 AI chat and research, GigaLearn, Document Studio, Creator Studio, GigaSocial, Marketplace, Enterprise and developer tools.",
});

const FAQ: FaqItem[] = [
  {
    question: "Are Giga3 Hub products separate apps?",
    answer:
      "No. Giga3 Hub brings its available tools together under one account. Sign-in and applicable credits are shared across supported services. Individual tools may have their own access requirements and usage limits.",
  },
  {
    question: "Do I pay separately for each product?",
    answer: `One account covers everything. Chat, research, writing and image tools draw from the same credit balance: ${FREE_STARTER_CREDITS} free starter credits, then ${SUBSCRIPTION_PLANS.basic.label} (GHS ${SUBSCRIPTION_PLANS.basic.priceGhs}), ${SUBSCRIPTION_PLANS.pro.label} (GHS ${SUBSCRIPTION_PLANS.pro.priceGhs}) or ${SUBSCRIPTION_PLANS.premium.label} (GHS ${SUBSCRIPTION_PLANS.premium.priceGhs}) per month. Video AI uses a separate video-credit wallet with its own plans.`,
  },
  {
    question: "Which AI models power Giga3 AI?",
    answer:
      "AI requests are routed through the providers configured for each capability. Provider availability and fallback depend on the service and current configuration; a fallback does not guarantee every request will succeed.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: PATH,
          name: "Giga3 Hub Features — Connected Tools for Learning, Work and Creativity",
          description:
            "Explore Giga3 Hub: Giga3 AI chat and research, GigaLearn, Document Studio, Creator Studio, GigaSocial, Marketplace, Enterprise and developer tools.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Features", path: PATH },
        ]}
      />
      <JsonLd faq={FAQ} />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-4xl">
            <header className="max-w-3xl">
              <h1 className="page-title">Giga3 Hub features: connected tools for learning, work and creativity</h1>
              <p className="section-lead mt-4">
                Giga3 Hub brings together Giga3 AI assistance, learning, document creation, creator tools,
                community, marketplace and organisation services. The catalogue below links to
                the relevant product pages; availability and access requirements vary by tool.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/chat/login" size="lg">
                  Start free with {FREE_STARTER_CREDITS} credits
                </ButtonLink>
                <ButtonLink href="/pricing" variant="secondary" size="lg">
                  Compare plans
                </ButtonLink>
              </div>
            </header>

            <nav aria-label="Feature groups" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {PRODUCT_GROUPS.map((group) => (
                <a key={group.id} href={`#${group.id}`} className="font-medium text-accent hover:underline">
                  {group.title}
                </a>
              ))}
            </nav>

            {PRODUCT_GROUPS.map((group) => (
              <section key={group.id} id={group.id} className="mt-14 scroll-mt-24">
                <ArticleH2>{group.title}</ArticleH2>
                <p className="mt-2 text-base text-muted">{group.lead}</p>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {productsInGroup(group.id).map((product) => (
                    <li key={product.href}>
                      <Link
                        href={`${product.href}/`}
                        // 16 route bundles would otherwise prefetch on scroll — costly on metered mobile data.
                        prefetch={false}
                        className="saas-card block h-full rounded-2xl border border-border p-5 transition hover:border-violet-300 hover:shadow-md"
                      >
                        <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                        <p className="mt-0.5 text-sm font-medium text-accent">{product.tagline}</p>
                        <p className="mt-3 text-sm leading-relaxed text-muted">{product.description}</p>
                        {product.app && (
                          <p className="mt-3 text-xs text-muted">Sign-in required to use</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="mt-14 max-w-3xl space-y-4">
              <ArticleH2>How the pieces fit together</ArticleH2>
              <Prose>
                Use <ArticleLink href="/creator-studio">Creator Studio</ArticleLink> to draft content, share supported work through
                <ArticleLink href="/gigasocial">GigaSocial</ArticleLink>, and explore digital resources on the
                <ArticleLink href="/marketplace">Marketplace</ArticleLink>. Students can move from an
                <ArticleLink href="/chat">AI Chat</ArticleLink> explanation to
                <ArticleLink href="/gigalearn">GigaLearn</ArticleLink> practice, while eligible schools and teams can explore
                <ArticleLink href="/enterprise">workspaces</ArticleLink> and
                <ArticleLink href="/automation">automation</ArticleLink>.
              </Prose>
              <Prose>
                Billing is presented in Ghanaian cedis through Paystack. Credit usage and eligible services vary by tool. See{" "}
                <ArticleLink href="/pricing">pricing</ArticleLink> for the current plans.
              </Prose>
            </section>

            <div className="max-w-3xl">
              <FaqSection items={FAQ} />
              <RelatedReading
                links={[
                  { href: "/pricing", label: "Plans and GHS pricing" },
                  { href: "/ai-for-ghana", label: "AI for Students, Creators and Businesses in Ghana" },
                  { href: "/african-ai-tools", label: "African AI tools on Giga3" },
                  { href: "/ai-for-teachers-ghana", label: "AI for teachers in Ghana" },
                  { href: "/ai-for-bece-wassce-ghana", label: "AI for BECE & WASSCE preparation" },
                  { href: "/ai-tools-for-students-ghana", label: "Best AI tools for university students in Ghana 2026" },
                  { href: "/install", label: "Install the Giga3 AI app" },
                ]}
              />
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}
