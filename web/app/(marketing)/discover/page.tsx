import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DiscoverPageClient = dynamic(
  () =>
    import("@/components/trends/DiscoverPageClient").then((m) => ({
      default: m.DiscoverPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading discover…</p> }
);

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Discover popular AI prompts, educational content, creator tools, study resources, marketplace products, and communities on Giga3 AI.",
};

export default function DiscoverPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading discover…</p>}>
          <DiscoverPageClient />
        </Suspense>
      </Container>
    </div>
  );
}
