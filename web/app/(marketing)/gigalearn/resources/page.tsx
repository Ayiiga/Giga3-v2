import type { Metadata } from "next";
import { TeachingResourcesLibrary } from "@/components/gigalearn/TeachingResourcesLibrary";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata: Metadata = publicMetadata({
  path: "/gigalearn/resources",
  title: "Teaching Materials & Practical Resources | GigaLearn",
  description: "Explore Ghana JHS and SHS teaching materials, laboratory equipment, practical guides and learning resources.",
});

export default function TeachingResourcesPage() {
  return (
    <>
      <ProductSeoHeader title="Teaching Materials & Practical Resources" description="Ghana JHS and SHS practical learning library." />
      <JsonLd />
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <TeachingResourcesLibrary />
      </div>
    </>
  );
}
