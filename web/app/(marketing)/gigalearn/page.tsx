import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { PublicProductPageShell } from "@/components/seo/PublicProductPageShell";
import { JsonLd } from "@/components/seo/JsonLd";
import { GIGALEARN_PAGE_SHELL } from "@/lib/seo/productPageContent";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GIGALEARN_META_DESCRIPTION =
  "GigaLearn is an AI-powered learning assistant for Ghanaian students and teachers, supporting study, explanations, practice and BECE and WASSCE preparation.";

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
  title: "GigaLearn — AI Tutor for BECE & WASSCE in Ghana | Giga3 AI",
  description: GIGALEARN_META_DESCRIPTION,
});

export default function GigaLearnPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/gigalearn",
          name: "GigaLearn — AI Tutor & Exam Prep for Ghana",
          description: GIGALEARN_META_DESCRIPTION,
        }}
      />
      <JsonLd
        educationalApplication={{
          name: "GigaLearn",
          description: GIGALEARN_META_DESCRIPTION,
          path: "/gigalearn",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaLearn", path: "/gigalearn" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaLearn — AI Tutor & Exam Prep for Ghana"
        description={GIGALEARN_META_DESCRIPTION}
        detail="Structured study support for JHS and SHS students, teachers and parents — with BECE and WASSCE revision help, practice questions and responsible AI learning habits."
        showProductNav={false}
      />
      <div className="marketing-stable gigalearn-stable section-padding pt-4 pb-6 sm:pt-6">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn" />}>
          <GigaLearnPageRoot />
        </Suspense>
      </div>
      <PublicProductPageShell {...GIGALEARN_PAGE_SHELL} titleAs="h2" />
    </>
  );
}
