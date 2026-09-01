import dynamic from "next/dynamic";
import { Suspense } from "react";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const GigaSocialProfileLegacyRedirect = dynamic(
  () =>
    import("@/components/gigasocial/GigaSocialLegacyRedirects").then(
      (m) => m.GigaSocialProfileLegacyRedirect
    ),
  { ssr: false }
);

export const metadata = publicMetadata({
  path: "/gigasocial/profile",
  title: "GigaSocial creator profile",
  description:
    "View a public creator profile on GigaSocial — posts, photos, videos, and AI creations shared with the Giga3 AI community.",
});

export default function GigaSocialProfileLegacyPage() {
  return (
    <Suspense fallback={null}>
      <GigaSocialProfileLegacyRedirect />
    </Suspense>
  );
}
