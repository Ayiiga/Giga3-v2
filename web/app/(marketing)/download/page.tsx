import { JsonLd } from "@/components/seo/JsonLd";
import { PublicProductIntro } from "@/components/seo/PublicProductIntro";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/download",
  title: "Download Giga3 AI",
  description:
    "Install Giga3 AI, Africa's AI Super App, for a fast app-like experience on your phone or desktop browser.",
});

export default function DownloadPage() {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/download",
          name: "Download Giga3 AI",
          description:
            "Install Giga3 AI, Africa's AI Super App, for a fast app-like experience on your phone or desktop browser.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Download", path: "/download" },
        ]}
      />
      <PublicProductIntro
        title="Download Giga3 AI — Africa's AI Super App"
        description="Install Giga3 AI from your browser and open Social, AI, Learning, Creativity, and Business tools like an app."
        audience="people who want a lightweight, mobile-first way to use Giga3 AI."
        primaryHref="/install"
        primaryLabel="Install Giga3 AI"
      />
    </>
  );
}
