import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { buildOrganizationSchemaNode } from "@/lib/seo/organizationSchema";
import { SEO_ORGANIZATION_ID, SEO_WEBSITE_ID, seoPageId } from "@/lib/seo/schemaIds";
import type { OfferItem } from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/site";

type SiteStructuredDataProps = {
  /** Homepage pricing teaser offers — must match visible homepage pricing. */
  offers?: OfferItem[];
  homeDescription: string;
};

/** Single homepage JSON-LD graph: Organization, WebSite, WebPage, WebApplication, optional Offers. */
export function SiteStructuredData({ offers, homeDescription }: SiteStructuredDataProps) {
  const logo = brandingAssetUrl("/images/logo.png");
  const homeUrl = seoPageId("/");

  const graph: Record<string, unknown>[] = [
    buildOrganizationSchemaNode(),
    {
      "@type": "WebSite",
      "@id": SEO_WEBSITE_ID,
      name: branding.name,
      url: siteConfig.url,
      description: branding.description,
      publisher: { "@id": SEO_ORGANIZATION_ID },
    },
    {
      "@type": "WebPage",
      "@id": homeUrl,
      url: homeUrl,
      name: "Giga3 AI — Africa's AI Super App for Ghana",
      description: homeDescription,
      isPartOf: { "@id": SEO_WEBSITE_ID },
      about: { "@id": SEO_ORGANIZATION_ID },
    },
    {
      "@type": "WebApplication",
      name: branding.name,
      url: siteConfig.url,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires JavaScript",
      description: branding.description,
      image: logo,
    },
  ];

  if (offers && offers.length > 0) {
    graph.push({
      "@type": "SoftwareApplication",
      name: branding.name,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      url: siteConfig.url,
      image: logo,
      offers: offers.map((offer) => ({
        "@type": "Offer",
        name: offer.name,
        price: offer.price.toFixed(2),
        priceCurrency: offer.priceCurrency,
        availability: "https://schema.org/InStock",
        url: new URL(offer.path, siteConfig.url).toString(),
        ...(offer.description ? { description: offer.description } : {}),
      })),
    });
  }

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }} />
  );
}
