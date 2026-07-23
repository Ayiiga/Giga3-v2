"use client";

import { Button } from "@/components/ui/Button";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Ticket } from "lucide-react";
import { useState } from "react";

type AdminCreds = { adminSessionToken: string };

const COHORTS = [
  "trusted_tester",
  "student",
  "teacher",
  "creator",
  "community_leader",
  "existing",
] as const;

export function AdminPhase5BetaPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const flags = usePhase5Flags();
  // Matches server: create allowed when phase5.admin_tools OR phase5.beta is on.
  const canCreateInvite = flags.beta || flags.adminTools;
  const data = useQuery(api.phase5Beta.listBetaAdmin, adminCreds);
  const createInvite = useMutation(api.phase5Beta.createBetaInviteAdmin);
  const updateWaitlist = useMutation(api.phase5Beta.updateWaitlistStatusAdmin);
  const [cohort, setCohort] = useState<(typeof COHORTS)[number]>("trusted_tester");
  const [maxUses, setMaxUses] = useState("10");
  const [busy, setBusy] = useState(false);

  if (data === undefined) {
    return <p className="text-sm text-muted">Loading beta ops…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
          <Ticket className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Public beta invites</h2>
          <p className="mt-1 text-sm text-muted">
            Create cohort invite codes and review the waitlist. End-user UI stays
            hidden until <code className="text-xs">phase5.beta</code> is enabled.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Invites" value={data.stats.inviteCount} />
        <Stat label="Cohort members" value={data.stats.cohortMembers} />
        <Stat label="Onboarded" value={data.stats.onboardedMembers} />
        <Stat label="Activation %" value={`${data.stats.activationRate}%`} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <label className="text-sm">
          Cohort
          <select
            className="mt-1 block rounded-lg border bg-background px-3 py-2"
            value={cohort}
            onChange={(e) => setCohort(e.target.value as (typeof COHORTS)[number])}
          >
            {COHORTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Max uses
          <input
            className="mt-1 block w-24 rounded-lg border bg-background px-3 py-2"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <Button
          size="sm"
          disabled={busy || !canCreateInvite}
          title={
            !canCreateInvite
              ? "Enable phase5.beta or phase5.admin_tools first"
              : undefined
          }
          onClick={() => {
            void (async () => {
              setBusy(true);
              onError("");
              try {
                const result = await createInvite({
                  ...adminCreds,
                  cohort,
                  maxUses: Number(maxUses) || 1,
                });
                onNotice(`Created invite ${result.code}`);
              } catch (e) {
                onError(e instanceof Error ? e.message : "Could not create invite.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          Create invite
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Cohort</th>
              <th className="px-3 py-2">Uses</th>
              <th className="px-3 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {data.invites.map((invite) => (
              <tr key={invite._id} className="border-b last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{invite.code}</td>
                <td className="px-3 py-2">{invite.cohort}</td>
                <td className="px-3 py-2">
                  {invite.usedCount}/{invite.maxUses}
                </td>
                <td className="px-3 py-2">{invite.active ? "yes" : "no"}</td>
              </tr>
            ))}
            {data.invites.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted" colSpan={4}>
                  No invite codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Waitlist (pending)</h3>
        <ul className="space-y-2">
          {data.waitlist.map((row) => (
            <li
              key={row._id}
              className="flex flex-col gap-2 rounded-xl border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium">{row.email}</div>
                <div className="text-xs text-muted">
                  {row.cohort}
                  {row.reason ? ` · ${row.reason}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void (async () => {
                    try {
                      await updateWaitlist({
                        ...adminCreds,
                        waitlistId: row._id,
                        status: "invited",
                      });
                      onNotice(`Marked ${row.email} as invited.`);
                    } catch (e) {
                      onError(
                        e instanceof Error ? e.message : "Could not update waitlist."
                      );
                    }
                  })();
                }}
              >
                Mark invited
              </Button>
            </li>
          ))}
          {data.waitlist.length === 0 && (
            <li className="text-sm text-muted">No pending waitlist entries.</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
