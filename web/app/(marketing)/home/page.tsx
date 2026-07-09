"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { AccessibilitySettings } from "@/components/a11y/AccessibilitySettings";
import { HomeDashboardPanel } from "@/components/dashboard/HomeDashboardPanel";
import { ReferralCard } from "@/components/growth/ReferralCard";
import { PrivacyControlsPanel } from "@/components/platform/PrivacyControlsPanel";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";

export default function HomeDashboardPage() {
  return (
    <ConvexAppShell>
      <div className="marketing-stable min-h-full bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-4xl">
            <h1 className="page-title">Your dashboard</h1>
            <VisionTagline className="mt-2" variant="subtle" />
            <p className="mt-2 text-sm text-muted">
              Personalized overview for {siteConfig.name} — activity, goals, and recommendations.
            </p>
            <div className="mt-8 space-y-6">
              <HomeDashboardPanel />
              <div className="grid gap-6 lg:grid-cols-2">
                <ReferralCard />
                <PrivacyControlsPanel />
              </div>
              <AccessibilitySettings />
            </div>
          </div>
        </Container>
      </div>
    </ConvexAppShell>
  );
}
