import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AutomationPageClient = dynamic(
  () =>
    import("@/components/automation/AutomationPageClient").then((m) => ({
      default: m.AutomationPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Automation & Workflows",
  description:
    "AI workflow automation, specialized agents, integrations, and platform search for Giga3 AI.",
};

export default function AutomationPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading automation…</p>}>
          <AutomationPageClient />
        </Suspense>
      </Container>
    </div>
  );
}
