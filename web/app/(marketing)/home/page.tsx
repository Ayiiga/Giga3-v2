"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { AccessibilitySettings } from "@/components/a11y/AccessibilitySettings";
import { HomeDashboardPanel } from "@/components/dashboard/HomeDashboardPanel";
import { ReferralCard } from "@/components/growth/ReferralCard";
import { Phase5GrowthHub } from "@/components/phase5/Phase5GrowthHub";
import { Phase6ScaleHub } from "@/components/phase6/Phase6ScaleHub";
import { PlatformProfileProvider } from "@/components/platform/PlatformProfileProvider";
import { PrivacyControlsPanel } from "@/components/platform/PrivacyControlsPanel";
import { PlatformSettingsPanel } from "@/components/platform/PlatformSettingsPanel";
import { SettingsAdminDashboardPanel } from "@/components/platform/SettingsAdminDashboardPanel";
import { Container } from "@/components/ui/Container";

/**
 * Secondary overview surface. Primary Home for day-to-day work is AI Chat (`/chat`).
 * Kept lean: resume + destinations first; settings/growth hubs below.
 */
export default function HomeDashboardPage() {
  return (
    <ConvexAppShell>
      <PlatformProfileProvider>
        <Container className="section-padding">
          <div className="dashboard-stable mx-auto max-w-4xl">
            <h1 className="page-title">Your hub</h1>
            <p className="mt-2 text-sm text-muted">
              Resume unfinished work, open destinations, and jump back into Chat when you are
              ready to accomplish something.
            </p>
            <div className="mt-6 space-y-6">
              <HomeDashboardPanel />
              <div className="dashboard-panel-grid">
                <ReferralCard />
                <PrivacyControlsPanel />
              </div>
              <details className="rounded-xl border border-border px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Settings and growth tools
                </summary>
                <div className="mt-4 space-y-6">
                  <PlatformSettingsPanel />
                  <SettingsAdminDashboardPanel />
                  <Phase5GrowthHub />
                  <Phase6ScaleHub />
                  <AccessibilitySettings />
                </div>
              </details>
            </div>
          </div>
        </Container>
      </PlatformProfileProvider>
    </ConvexAppShell>
  );
}
