import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";

const EnterpriseLandingClient = dynamic(
  () =>
    import("@/components/enterprise/EnterpriseLandingClient").then((m) => ({
      default: m.EnterpriseLandingClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/enterprise",
  title: "Enterprise & Education — Giga3 AI Workspaces",
  description:
    "Giga3 AI workspaces for schools, universities, NGOs, and businesses with role-based access control, classrooms, and organization dashboards.",
});

export default function EnterprisePage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Enterprise", path: "/enterprise" },
        ]}
      />
      <ProductSeoHeader
        title="Enterprise & Education"
        description="Deploy Giga3 AI for schools, universities, NGOs, and teams with workspace roles, classroom tools, and organization analytics."
        detail="Explore workspace features for educators and administrators who need secure, role-based access to AI chat, GigaLearn, and creator tools."
        showProductNav={false}
      />
      <div className="marketing-stable section-padding pt-8 pb-8">
        <Container>
          <EnterpriseLandingClient />
        </Container>
      </div>
    </>
  );
}
