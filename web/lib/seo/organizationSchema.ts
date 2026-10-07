import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";
import { SEO_ORGANIZATION_ID } from "@/lib/seo/schemaIds";

/** Authoritative Organization node — emit once on the homepage structured-data graph. */
export function buildOrganizationSchemaNode() {
  const logo = brandingAssetUrl("/images/logo.png");
  return {
    "@type": "Organization" as const,
    "@id": SEO_ORGANIZATION_ID,
    name: branding.name,
    url: siteConfig.url,
    logo,
    description: branding.description,
    email: siteConfig.contact.email,
    founder: {
      "@type": "Person",
      name: siteConfig.founder.name,
      alternateName: siteConfig.founder.alias,
      jobTitle: siteConfig.founder.role,
    },
    parentOrganization: {
      "@type": "Organization",
      name: siteConfig.founder.organization,
    },
    address: { "@type": "PostalAddress", addressCountry: "GH" },
    foundingLocation: { "@type": "Place", name: "Ghana" },
    areaServed: ["GH", "Africa", "Worldwide"],
    sameAs: [siteConfig.links.github],
  };
}
