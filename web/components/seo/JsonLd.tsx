import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { siteConfig } from "@/lib/site";

type JsonLdProps = {
  type?: "WebSite" | "Organization" | "SoftwareApplication";
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
