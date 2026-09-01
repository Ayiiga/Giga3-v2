import dynamic from "next/dynamic";
import { Suspense } from "react";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const GigaSocialPostLegacyRedirect = dynamic(
  () =>
    import("@/components/gigasocial/GigaSocialLegacyRedirects").then(
      (m) => m.GigaSocialPostLegacyRedirect
    ),
  { ssr: false }
);

export const metadata = publicMetadata({
  path: "/gigasocial/post",
  title: "GigaSocial post",
  description:
    "View a shared public post from GigaSocial on Giga3 AI — connect, share videos, and join the community.",
});

export default function GigaSocialPostLegacyPage() {
  return (
    <Suspense fallback={null}>
      <GigaSocialPostLegacyRedirect />
    </Suspense>
  );
}
