import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: "/insights/" },
};

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
