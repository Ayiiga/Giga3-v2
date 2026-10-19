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
        expandLabel="Learn more"
        collapseLabel="Show less"
        title="GigaLearn — Learn Smarter, Score Higher"
        description="Explore Ghana curriculum-aligned lessons, practise exam questions, track your progress, and learn with your AI tutor."
        detail={`${GIGALEARN_META_DESCRIPTION} Structured study support for JHS and SHS students, teachers and parents — with BECE and WASSCE revision help, practice questions and responsible AI learning habits.`}
        showProductNav={false}
      />
      {/* Compact app shell padding — do not use the marketing py-20 utility here. */}
      <div className="marketing-stable gigalearn-stable px-4 py-3 pb-6 sm:px-6 sm:py-4">
        <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn" />}>
          <GigaLearnPageRoot />
        </Suspense>
      </div>
      <PublicProductPageShell
        {...GIGALEARN_PAGE_SHELL}
        title="How GigaLearn works"
        titleAs="h2"
        compact
      />
    </>
  );
}
