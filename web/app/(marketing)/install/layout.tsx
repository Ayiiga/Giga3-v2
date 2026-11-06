import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/install",
  title: "Install the Giga3 Hub App (PWA)",
  description:
    "Install Giga3 Hub on Android, iPhone or desktop as a progressive web app: fast, app-like access to AI chat, GigaLearn, GigaSocial and creator tools.",
});

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        webPage={{
          path: "/install",
          name: "Install the Giga3 Hub App (PWA)",
          description:
            "Install Giga3 Hub on Android, iPhone or desktop as a progressive web app for fast, app-like access.",
        }}
      />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 Hub", path: "/" },
          { name: "Install", path: "/install" },
        ]}
      />
      {children}
    </>
  );
}
