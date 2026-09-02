import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/install",
  title: "Install the Giga3 AI App (PWA)",
  description:
    "Install Giga3 AI on Android, iPhone or desktop as a progressive web app: fast, app-like access to AI chat, GigaLearn, GigaSocial and creator tools.",
});

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
