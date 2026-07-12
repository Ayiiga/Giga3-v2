import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const TrendingPageClient = dynamic(
  () =>
    import("@/components/trends/TrendingPageClient").then((m) => ({
      default: m.TrendingPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading trends…</p> }
);

export const metadata: Metadata = {
  title: "Trending",
  description:
    "Trending AI topics on Giga3 — artificial intelligence, coding, education, business, sports, technology, health, finance, entertainment, and creator economy.",
};

export default function TrendingPage() {
  return (
    <div className="discover-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading trends…</p>}>
          <TrendingPageClient />
        </Suspense>
      </Container>
    </div>
  );
}
