import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const EnterpriseWorkspaceClient = dynamic(
  () =>
    import("@/components/enterprise/EnterpriseWorkspaceClient").then((m) => ({
      default: m.EnterpriseWorkspaceClient,
    })),
  {
    ssr: false,
    loading: () => (
      <ClientAppHydrationNotice
        productName="organisation workspace"
        signInHref="/chat/login?next=/workspace"
      />
    ),
  }
);

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "School and organization workspace — classrooms, assignments, analytics, and role-based dashboards.",
  robots: { index: false, follow: false },
};

export default function WorkspacePage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <header className="mx-auto mb-8 max-w-2xl text-center">
          <h1 className="page-title">Organisation workspace</h1>
          <p className="mt-3 text-muted">
            Sign in to create or open a school or enterprise workspace. You need a Giga3 account —
            billing for org volume is arranged via{" "}
            <a href="/enterprise/" className="font-medium text-accent underline underline-offset-2">
              Enterprise sales
            </a>
            , not self-serve checkout.
          </p>
        </header>
        <Suspense
          fallback={
            <ClientAppHydrationNotice
              productName="organisation workspace"
              signInHref="/chat/login?next=/workspace"
            />
          }
        >
          <EnterpriseWorkspaceClient />
        </Suspense>
      </Container>
    </div>
  );
}
