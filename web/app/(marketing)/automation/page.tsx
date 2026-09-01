import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const AutomationPageClient = dynamic(
  () =>
    import("@/components/automation/AutomationPageClient").then((m) => ({
      default: m.AutomationPageClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/automation",
  title: "Automation & Workflows — Giga3 AI",
  description:
    "AI workflow automation, specialized agents, integrations, and platform search for teams using Giga3 AI across chat, learning, and creator tools.",
});

export default function AutomationPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Automation", path: "/automation" },
        ]}
      />
      <ProductSeoHeader
        title="Automation & Workflows"
        description="Build AI-assisted workflows with specialized agents, integrations, and platform search inside Giga3 AI."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <Suspense fallback={<p className="text-center text-muted">Loading automation…</p>}>
            <AutomationPageClient />
          </Suspense>
        </Container>
      </div>
    </>
  );
}
