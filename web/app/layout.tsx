import { AppPullToRefresh } from "@/components/pwa/AppPullToRefresh";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { siteConfig } from "@/lib/site";
import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    images: [{ url: "/images/logo.png", width: 512, height: 512, alt: "Giga3 AI" }],
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AppPullToRefresh>{children}</AppPullToRefresh>
        <ServiceWorkerRegister />
        <OfflineBanner />
      </body>
    </html>
  );
}
