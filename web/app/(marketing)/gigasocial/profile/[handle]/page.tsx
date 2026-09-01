import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { GigaSocialProfileJsonLd } from "@/components/seo/DynamicPublicJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { GigaSocialProfileDetailShell } from "@/components/gigasocial/GigaSocialProfileDetailShell";
import { fetchPublicProfileHandles, fetchPublicProfileSeoBundle } from "@/lib/seo/convexBuildFetch";
import { gigaSocialProfilePath } from "@/lib/seo/publicPaths";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import type { Metadata } from "next";

type PageProps = {
  params: { handle: string };
};

export async function generateStaticParams() {
  try {
    const handles = await fetchPublicProfileHandles();
    return handles.length ? handles.map((handle) => ({ handle })) : [{ handle: "__build_placeholder__" }];
  } catch {
    return [{ handle: "__build_placeholder__" }];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const bundle = await fetchPublicProfileSeoBundle(params.handle);
  if (!bundle) {
    return publicMetadata({
      path: gigaSocialProfilePath(params.handle),
      title: "GigaSocial profile not found",
      description: "This creator profile is not available on GigaSocial.",
      index: false,
    });
  }

  const description =
    bundle.bio ??
    `${bundle.displayName} shares public posts on GigaSocial through Giga3 AI.`;

  return publicMetadata({
    path: gigaSocialProfilePath(params.handle),
    title: `${bundle.displayName} (@${bundle.handle})`,
    description,
  });
}

export default async function GigaSocialProfileDetailPage({ params }: PageProps) {
  const bundle = await fetchPublicProfileSeoBundle(params.handle);

  if (!bundle) {
    return (
      <ProductSeoHeader
        title="GigaSocial profile not found"
        description="This creator handle does not exist or is unavailable."
        showProductNav={false}
      />
    );
  }

  const description =
    bundle.bio ??
    `${bundle.displayName} has ${bundle.publicPostCount} public posts on GigaSocial.`;

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: `@${bundle.handle}`, path: gigaSocialProfilePath(params.handle) },
        ]}
      />
      <GigaSocialProfileJsonLd
        handle={bundle.handle}
        displayName={bundle.displayName}
        description={description}
        imageUrl={bundle.avatarUrl}
      />
      <ProductSeoHeader
        title={`${bundle.displayName} (@${bundle.handle})`}
        description={description}
        detail="Only public posts and profile details are shown here. Private posts, messages, and followers-only content stay private."
        showProductNav={false}
      />
      <GigaSocialProfileDetailShell />
    </>
  );
}
