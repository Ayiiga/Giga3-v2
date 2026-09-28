import type { Metadata } from "next";
import { NotFoundClient } from "@/components/seo/NotFoundClient";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist on Giga3 AI.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/404.html" },
};

export default function NotFound() {
  return (
    <main id="main-content" className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">404</p>
          <h1 className="page-title mt-2">We couldn&apos;t find that page</h1>
          <p className="section-lead mx-auto mt-4 max-w-lg">
            The link may be outdated or mistyped. Everything on Giga3 AI is one click away from
            the home page or the feature overview.
          </p>
          <NotFoundClient />
        </div>
      </Container>
    </main>
  );
}
