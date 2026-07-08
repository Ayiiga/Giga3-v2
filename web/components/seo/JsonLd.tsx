import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";

type JsonLdProps = {
  type?: "WebSite" | "Organization";
};

/** Structured data for public marketing pages — no authenticated or private URLs. */
export function JsonLd({ type = "WebSite" }: JsonLdProps) {
  const logo = brandingAssetUrl("/images/logo.png");
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
