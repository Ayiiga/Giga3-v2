import { publicMetadata } from "@/lib/seo/publicMetadata";

// Flag-gated release notes shell — indexable once marketing readiness is enabled.
export const metadata = publicMetadata({
  path: "/whats-new",
  title: "What’s New in Giga3 AI",
  description: "Release notes and product updates across Giga3 AI chat, GigaSocial, GigaLearn, GigaEdit and Media Studio.",
  index: false,
});

export default function WhatsNewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
