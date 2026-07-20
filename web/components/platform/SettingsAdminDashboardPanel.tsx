"use client";

import { SettingsPanelSkeleton } from "@/components/platform/SettingsPanelSkeleton";
import { ButtonLink } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { isPlatformOwnerEmail } from "@/lib/platformAdmin";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { BarChart3, Shield } from "lucide-react";

export function SettingsAdminDashboardPanel() {
  const sessionToken = getSessionToken();
  const adminCheck = useQuery(
    api.adminAuth.isCurrentUserPlatformAdmin,
    sessionToken ? { sessionToken } : "skip"
  );

  if (!sessionToken) return null;

  if (adminCheck === undefined) {
    return <SettingsPanelSkeleton title="admin access" />;
  }

  const visible =
    adminCheck.isAdmin === true && isPlatformOwnerEmail(adminCheck.email);

  if (!visible) return null;

  return (
    <div className="settings-panel-card saas-card space-y-4 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Admin dashboard</h3>
          <p className="mt-1 text-sm text-muted">
            Platform operations — users, marketplace payouts, GigaSocial economy, and
            system health. Restricted to the platform owner account.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/admin/" className="inline-flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden />
          Open admin dashboard
        </ButtonLink>
        <ButtonLink href="/insights/" variant="outline" className="inline-flex items-center gap-2">
          Platform insights
        </ButtonLink>
      </div>
    </div>
  );
}
