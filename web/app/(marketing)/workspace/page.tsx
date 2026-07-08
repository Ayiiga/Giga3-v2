import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const EnterpriseWorkspaceClient = dynamic(
  () =>
    import("@/components/enterprise/EnterpriseWorkspaceClient").then((m) => ({
      default: m.EnterpriseWorkspaceClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "School and organization workspace — classrooms, assignments, analytics, and role-based dashboards.",
};

export default function WorkspacePage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading workspace…</p>}>
          <EnterpriseWorkspaceClient />
        </Suspense>
      </Container>
    </div>
  );
}
