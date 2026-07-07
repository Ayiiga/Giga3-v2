import { GenerationToastHost } from "@/components/generation/GenerationToastHost";
import { ConvexRuntimeBootstrap } from "@/components/providers/ConvexRuntimeBootstrap";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { DeferredPwaChrome } from "@/components/pwa/DeferredPwaChrome";
import { PlatformAnalyticsHost } from "@/components/analytics/PlatformAnalyticsHost";
import { GlobalChatPrefetch } from "@/components/chat/GlobalChatPrefetch";
import { branding } from "@/lib/branding";
import { brandingAssetUrl } from "@/lib/brandingAssets";
import { pwaStartupImages } from "@/lib/pwaSplash";
import { siteConfig } from "@/lib/site";
import "@/styles/globals.css";
import "@/styles/generation.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: branding.description,
  applicationName: branding.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: branding.shortName,
    startupImage: pwaStartupImages.map((img) => ({
      url: img.url,
      media: img.media,
    })),
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    images: [{ url: brandingAssetUrl("/images/logo.png"), width: 512, height: 512, alt: branding.name }],
    locale: "en_US",
    url: siteConfig.url,
    siteName: branding.name,
    title: branding.name,
    description: branding.description,
  },
  twitter: {
    card: "summary_large_image",
    title: branding.name,
    description: branding.description,
    images: [brandingAssetUrl("/images/logo.png")],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: brandingAssetUrl("/icons/favicon-16.png"), sizes: "16x16", type: "image/png" },
      { url: brandingAssetUrl("/icons/favicon-32.png"), sizes: "32x32", type: "image/png" },
      { url: brandingAssetUrl("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
      { url: brandingAssetUrl("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: brandingAssetUrl("/icons/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: branding.themeColor },
    { media: "(prefers-color-scheme: dark)", color: branding.themeColor },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-full w-full max-w-full overflow-x-hidden bg-background font-sans text-foreground antialiased">
        <ConvexRuntimeBootstrap />
        <ThemeProvider>
          <div className="min-h-full w-full max-w-full overflow-x-hidden">{children}</div>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <GlobalChatPrefetch />
        <PlatformAnalyticsHost />
        <DeferredPwaChrome />
        <GenerationToastHost />
      </body>
    </html>
  );
}
