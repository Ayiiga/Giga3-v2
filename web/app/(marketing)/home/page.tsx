"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { AccessibilitySettings } from "@/components/a11y/AccessibilitySettings";
import { HomeDashboardPanel } from "@/components/dashboard/HomeDashboardPanel";
import { ReferralCard } from "@/components/growth/ReferralCard";
import { PlatformProfileProvider } from "@/components/platform/PlatformProfileProvider";
import { PrivacyControlsPanel } from "@/components/platform/PrivacyControlsPanel";
import { PlatformSettingsPanel } from "@/components/platform/PlatformSettingsPanel";
import { SettingsAdminDashboardPanel } from "@/components/platform/SettingsAdminDashboardPanel";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";

export default function HomeDashboardPage() {
  return (
    <ConvexAppShell>
      <PlatformProfileProvider>
        <Container className="section-padding">
          <div className="dashboard-stable mx-auto max-w-4xl">
            <h1 className="page-title">Your dashboard</h1>
            <VisionTagline className="mt-2" variant="subtle" />
            <p className="mt-2 text-sm text-muted">
              Personalized overview for {siteConfig.name} — activity, goals, and recommendations.
            </p>
            <div className="mt-8 space-y-6">
              <HomeDashboardPanel />
              <PlatformSettingsPanel />
              <SettingsAdminDashboardPanel />
              <div className="dashboard-panel-grid">
                <ReferralCard />
                <PrivacyControlsPanel />
              </div>
              <AccessibilitySettings />
            </div>
          </div>
        </Container>
      </PlatformProfileProvider>
    </ConvexAppShell>
  );
}
