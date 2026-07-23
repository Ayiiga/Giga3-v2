"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { usePhase6Flags } from "@/hooks/usePhase6Flags";
import { getSessionToken } from "@/lib/auth";
import { listAfricaRegions } from "@/lib/regions/africa";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

/** Compact Phase 6 hub — renders nothing when all flags are off. */
export function Phase6ScaleHub() {
  const flags = usePhase6Flags();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(getSessionToken());
  }, []);

  const any =
    flags.multiRegion ||
    flags.creatorEcosystem ||
    flags.education ||
    flags.orgAccounts ||
    flags.aiPlatform ||
    flags.commerce ||
    flags.partnerships ||
    flags.compliance;
  if (!any || !token) return null;

  return (
    <div className="space-y-4">
      {flags.multiRegion && <RegionCard sessionToken={token} />}
      {flags.creatorEcosystem && <CreatorCard sessionToken={token} />}
      {flags.education && <EducationCard sessionToken={token} />}
      {flags.orgAccounts && <OrgCard sessionToken={token} />}
      {flags.aiPlatform && <AiCard sessionToken={token} />}
      {flags.commerce && <CommerceCard sessionToken={token} />}
      {flags.partnerships && <PartnershipCard sessionToken={token} />}
      {flags.compliance && <ComplianceCard sessionToken={token} />}
    </div>
  );
}

function RegionCard({ sessionToken }: { sessionToken: string }) {
  const pref = useQuery(api.phase6MultiRegion.getMyRegionPreference, {
    sessionToken,
  });
  const setRegion = useMutation(api.phase6MultiRegion.setMyRegionPreference);
  const [busy, setBusy] = useState(false);
  if (!pref?.enabled) return null;
  return (
    <Card title="Your region">
      <p className="text-sm text-muted">{pref.onboardingHint}</p>
      <label className="mt-3 block text-sm">
        Country
        <select
          className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          value={pref.regionId}
          disabled={busy}
          onChange={(e) => {
            void (async () => {
              setBusy(true);
              try {
                await setRegion({ sessionToken, regionId: e.target.value });
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          {listAfricaRegions().map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.timeZone})
            </option>
          ))}
        </select>
      </label>
    </Card>
  );
}

function CreatorCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6CreatorEcosystem.getCreatorEcosystemSummary, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  return (
    <Card title="Creator ecosystem">
      <p className="text-sm text-muted">
        {data.audience.posts} posts · avg engagement {data.audience.avgEngagement}
        {data.campaigns.brandCollabReady ? " · brand-collab ready" : ""}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
        {data.milestones
          .filter((m) => m.earned)
          .map((m) => (
            <li key={m.id} className="rounded-full bg-muted px-2 py-0.5">
              {m.label}
            </li>
          ))}
      </ul>
    </Card>
  );
}

function EducationCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6Education.getEducationPlatformSummary, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  return (
    <Card title="Education platform">
      <p className="text-sm text-muted">
        Streak {data.learning.streakDays} days
        {data.roles.inOrganization ? " · org member" : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {data.resources.map((r) => (
          <ButtonLink key={r.href + r.label} size="sm" variant="secondary" href={r.href}>
            {r.label}
          </ButtonLink>
        ))}
      </div>
    </Card>
  );
}

function OrgCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6OrgAccounts.getMyOrganizations, { sessionToken });
  if (!data?.enabled) return null;
  return (
    <Card title="Organization accounts">
      {data.organizations.length === 0 ? (
        <p className="text-sm text-muted">
          No org memberships yet. Schools and businesses can join via Enterprise.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {data.organizations.map((o) => (
            <li key={o.orgId}>
              {o.name} · {o.role}
            </li>
          ))}
        </ul>
      )}
      <ButtonLink className="mt-3" size="sm" href="/enterprise/" variant="secondary">
        Open Enterprise
      </ButtonLink>
    </Card>
  );
}

function AiCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6AiPlatform.getAiPlatformCatalog, { sessionToken });
  if (!data?.enabled) return null;
  return (
    <Card title="AI platform">
      <ul className="space-y-1 text-sm text-muted">
        {data.features.slice(0, 4).map((f) => (
          <li key={f.id}>
            {f.label} · {f.status}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">{data.note}</p>
    </Card>
  );
}

function CommerceCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6Commerce.getCommerceSummary, { sessionToken });
  if (!data?.enabled) return null;
  return (
    <Card title="Commerce & payments">
      <p className="text-sm text-muted">
        {data.transactions.successCount} successful / {data.transactions.recentCount}{" "}
        recent · payouts {data.payouts.count}
      </p>
      <div className="mt-3 flex gap-2">
        <ButtonLink size="sm" href={data.wallet.href} variant="secondary">
          Wallet
        </ButtonLink>
        <ButtonLink size="sm" href={data.subscriptions.managementHref} variant="ghost">
          Subscriptions
        </ButtonLink>
      </div>
    </Card>
  );
}

function PartnershipCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6Partnerships.getPartnershipsProgram, {
    sessionToken,
  });
  const submit = useMutation(api.phase6Partnerships.submitPartnershipInterest);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  if (!data?.enabled) return null;
  return (
    <Card title="Partnerships">
      <p className="text-sm text-muted">
        School, creator, business, and ambassador tracks — rate-limited applications.
      </p>
      <Button
        className="mt-3"
        size="sm"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            setStatus(null);
            try {
              await submit({
                sessionToken,
                partnerType: "ambassador",
                notes: "Phase 6 ambassador interest",
              });
              setStatus("Interest submitted for review.");
            } catch (e) {
              setStatus(e instanceof Error ? e.message : "Could not submit.");
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Apply as ambassador
      </Button>
      {status && <p className="mt-2 text-xs text-muted">{status}</p>}
    </Card>
  );
}

function ComplianceCard({ sessionToken }: { sessionToken: string }) {
  const data = useQuery(api.phase6Compliance.getComplianceControls, {
    sessionToken,
  });
  if (!data?.enabled) return null;
  return (
    <Card title="Privacy & governance">
      <p className="text-sm text-muted">
        Personalization sharing:{" "}
        {data.privacy.shareUsageForPersonalization ? "on" : "off"}
      </p>
      <ButtonLink className="mt-3" size="sm" href="/legal/privacy/" variant="ghost">
        Privacy policy
      </ButtonLink>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
