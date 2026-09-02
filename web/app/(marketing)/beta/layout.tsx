import { publicMetadata } from "@/lib/seo/publicMetadata";

// Flag-gated waitlist shell — not useful in search results.
export const metadata = publicMetadata({
  path: "/beta",
  title: "Giga3 AI Public Beta",
  description: "Controlled public beta signup and invite redemption for Giga3 AI.",
  index: false,
});

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
