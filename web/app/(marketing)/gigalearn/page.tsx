import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { GIGALEARN_PAGE_SHELL } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaLearnPageRoot = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnPageRoot").then((m) => ({
      default: m.GigaLearnPageRoot,
    })),
  {
    ssr: false,
    loading: () => <ClientAppHydrationNotice productName="GigaLearn" />,
  }
);

export const metadata = publicMetadata({
  path: "/gigalearn",
  title: "GigaLearn — AI Tutor and Exam Prep",
  description:
    "GigaLearn on Giga3 AI helps students, teachers and parents with AI homework help, BECE and WASSCE prep, practice questions, study plans and classroom tools.",
});

export default function GigaLearnPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
        ]}
      />
      <PublicProductPageShell {...GIGALEARN_PAGE_SHELL} />
      <div className="marketing-stable section-padding pt-0 pb-8">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn" />}>
          <GigaLearnPageRoot />
        </Suspense>
      </div>
    </>
  );
}
