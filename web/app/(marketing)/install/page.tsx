"use client";

import { InstallButton } from "@/components/pwa/InstallButton";
import { Container } from "@/components/ui/Container";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { siteConfig } from "@/lib/site";
import { Smartphone } from "lucide-react";

export default function InstallPage() {
  return (
    <div className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
            <BrandLogo size={56} className="shadow-none ring-0" />
          </div>
          <h1 className="page-title mt-6">Install {siteConfig.name}</h1>
          <VisionTagline className="mt-3 justify-center" />
          <p className="section-lead mx-auto mt-4 max-w-md">
            Add Giga3 to your home screen for a fast, app-like experience with offline support and push-ready alerts.
          </p>

          <div className="mt-8 flex justify-center">
            <InstallButton size="lg" />
          </div>

          <div className="saas-card mt-10 rounded-2xl p-6 text-left">
            <h2 className="flex items-center gap-2 font-semibold">
              <Smartphone className="h-4 w-4 text-accent" aria-hidden />
              How to install
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Open {siteConfig.name} in Chrome, Safari, or Edge on your phone or desktop.</li>
              <li>Tap the install button above, or use your browser&apos;s &ldquo;Add to Home Screen&rdquo; option.</li>
              <li>Launch Giga3 from your home screen — it works like a native app.</li>
            </ol>
          </div>
        </div>
      </Container>
    </div>
  );
}
