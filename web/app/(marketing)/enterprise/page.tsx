import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const EnterpriseLandingClient = dynamic(
  () =>
    import("@/components/enterprise/EnterpriseLandingClient").then((m) => ({
      default: m.EnterpriseLandingClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Enterprise & Education",
  description:
    "Giga3 AI workspaces for schools, universities, NGOs, and businesses with role-based access control.",
};

export default function EnterprisePage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <EnterpriseLandingClient />
      </Container>
    </div>
  );
}
