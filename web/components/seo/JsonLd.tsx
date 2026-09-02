import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";

export type FaqItem = { question: string; answer: string };

type JsonLdProps = {
  type?: "WebSite" | "Organization" | "SoftwareApplication" | "WebApplication";
  breadcrumbs?: { name: string; path: string }[];
  /** FAQPage — answers must match the visible FAQ text on the page. */
  faq?: FaqItem[];
};

/** Structured data for public marketing pages — no authenticated or private URLs. */
export function JsonLd({ type = "WebSite", breadcrumbs, faq }: JsonLdProps) {
  const logo = brandingAssetUrl("/images/logo.png");

  if (faq && faq.length > 0) {
    const payload = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
      />
    );
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    const payload = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: new URL(crumb.path, siteConfig.url).toString(),
      })),
    };
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
      />
    );
  }

  const payload =
    type === "Organization"
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: branding.name,
          url: siteConfig.url,
          logo,
          description: branding.description,
          email: siteConfig.contact.email,
          founder: {
            "@type": "Person",
            name: siteConfig.founder.name,
          },
        }
      : type === "SoftwareApplication"
        ? {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: branding.name,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: siteConfig.url,
            image: logo,
            description:
              "Giga3 AI is an African AI-powered super app combining social media, AI tools, creator editing, learning, marketplace and digital services in one platform.",
          }
        : type === "WebApplication"
          ? {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: branding.name,
              url: siteConfig.url,
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Web",
              browserRequirements: "Requires JavaScript",
              description: branding.description,
              image: logo,
            }
          : {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: branding.name,
          url: siteConfig.url,
          description: branding.description,
          publisher: {
            "@type": "Organization",
            name: branding.name,
            logo,
          },
        };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
