import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { ENTERPRISE_PAGE_SHELL } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";

const EnterpriseLandingClient = dynamic(
  () =>
    import("@/components/enterprise/EnterpriseLandingClient").then((m) => ({
      default: m.EnterpriseLandingClient,
    })),
  { ssr: false, loading: () => <ClientAppHydrationNotice productName="Enterprise workspace" signInHref="/chat/login?next=/workspace" /> }
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
      <PublicProductPageShell {...ENTERPRISE_PAGE_SHELL} />
      <div className="marketing-stable section-padding pt-0 pb-8">
        <Container>
          <EnterpriseLandingClient />
        </Container>
      </div>
    </>
  );
}
