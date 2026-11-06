import { JsonLd } from "@/components/seo/JsonLd";
import { PublicProductIntro } from "@/components/seo/PublicProductIntro";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/download",
  title: "Download Giga3 Hub",
  description:
    "Install Giga3 Hub, Africa's connected digital platform, for a fast app-like experience on your phone or desktop browser.",
});

export default function DownloadPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/download",
          name: "Download Giga3 Hub",
          description:
            "Install Giga3 Hub, Africa's connected digital platform, for a fast app-like experience on your phone or desktop browser.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 Hub", path: "/" },
          { name: "Download", path: "/download" },
        ]}
      />
      <PublicProductIntro
        title="Download Giga3 Hub — Africa's Connected Digital Platform"
        description="Install Giga3 Hub from your browser and open Social, AI, Learning, Creativity, and Business tools like an app."
        audience="people who want a lightweight, mobile-first way to use Giga3 Hub."
        primaryHref="/install"
        primaryLabel="Install Giga3 Hub"
      />
    </>
  );
}
