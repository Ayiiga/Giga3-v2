import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { GigaSocialPostJsonLd } from "@/components/seo/DynamicPublicJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { GigaSocialPostDetailShell } from "@/components/gigasocial/GigaSocialPostDetailShell";
import { fetchPublicPostIds, fetchPublicPostSeoBundle } from "@/lib/seo/convexBuildFetch";
import { gigaSocialPostPath } from "@/lib/seo/publicPaths";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import type { Metadata } from "next";

type PageProps = {
  params: { postId: string };
};

export async function generateStaticParams() {
  try {
    const postIds = await fetchPublicPostIds();
    return postIds.length ? postIds.map((postId) => ({ postId })) : [{ postId: "__build_placeholder__" }];
  } catch {
    return [{ postId: "__build_placeholder__" }];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const bundle = await fetchPublicPostSeoBundle(params.postId);
  if (!bundle) {
    return publicMetadata({
      path: gigaSocialPostPath(params.postId),
      title: "GigaSocial post unavailable",
      description: "This post was removed or is not publicly available.",
      index: false,
    });
  }

  const base = publicMetadata({
    path: gigaSocialPostPath(params.postId),
    title: bundle.title,
    description: bundle.description,
  });

  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      title: bundle.title,
      description: bundle.description,
      images: [{ url: bundle.imageUrl, alt: bundle.imageAlt }],
    },
    twitter: {
      ...base.twitter,
      card: "summary_large_image",
      title: bundle.title,
      description: bundle.description,
      images: [bundle.imageUrl],
    },
  };
}

export default async function GigaSocialPostDetailPage({ params }: PageProps) {
  const bundle = await fetchPublicPostSeoBundle(params.postId);

  if (!bundle) {
    return (
      <ProductSeoHeader
        title="GigaSocial post unavailable"
        description="This post was removed, is followers-only, or never existed."
        showProductNav={false}
      />
    );
  }

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: bundle.headline ?? "Post", path: gigaSocialPostPath(params.postId) },
        ]}
      />
      <GigaSocialPostJsonLd
        postId={params.postId}
        headline={bundle.headline ?? bundle.title}
        description={bundle.description}
        authorName={bundle.author.displayName}
        authorHandle={bundle.author.handle}
        datePublished={bundle.createdAt}
        imageUrl={bundle.imageUrl}
      />
      <ProductSeoHeader
        title={bundle.headline ?? bundle.title}
        description={bundle.bodyPreview}
        detail={`Public post by @${bundle.author.handle} on GigaSocial.`}
        showProductNav={false}
      />
      <GigaSocialPostDetailShell postId={params.postId} />
    </>
  );
}
