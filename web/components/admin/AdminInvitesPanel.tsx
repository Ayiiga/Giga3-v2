"use client";

import { Button } from "@/components/ui/Button";
import { getAdminSessionToken } from "@/lib/adminAuth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

type InviteRole = "tester" | "creator" | "admin";

export function AdminInvitesPanel() {
  const adminCreds = useMemo(() => {
    const token = getAdminSessionToken();
    return token ? { adminSessionToken: token } : null;
  }, []);

  const data = useQuery(api.adminInvites.listInvites, adminCreds ?? "skip");
  const sendInvite = useAction(api.adminInvites.sendInviteEmail);
  const resendInvite = useAction(api.adminInvites.resendInviteEmail);
  const revokeInvite = useMutation(api.adminInvites.revokeInvite);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("tester");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!adminCreds) return null;
  if (data === undefined) {
    return <p className="text-sm text-muted">Loading invites…</p>;
  }
  if (data === null) return null;

  async function handleInvite() {
    if (!adminCreds || !email.trim()) return;
    setBusy("invite");
    setError(null);
    setNotice(null);
    try {
      await sendInvite({
        ...adminCreds,
        email: email.trim(),
        role,
        invitedBy: "giga3ai@gmail.com",
      });
      setEmail("");
      setNotice(`Invite sent to ${email.trim()} via giga3ai@gmail.com`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">Invite people</h2>
      <p className="mt-1 text-sm text-muted">
        Send magic-link invites via giga3ai@gmail.com (Resend). Stats: {data.stats.total}{" "}
        total · {data.stats.accepted} accepted · {data.stats.acceptanceRate}% rate
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-background px-3"
            placeholder="creator@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InviteRole)}
            className="min-h-11 rounded-xl border border-border bg-background px-3"
          >
            <option value="tester">Tester</option>
            <option value="creator">Creator</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <Button type="button" disabled={busy !== null || !email.trim()} onClick={() => void handleInvite()}>
          Invite via giga3ai@gmail.com
        </Button>
      </div>

      {notice ? (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">Sent</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.pending.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-muted">
                  No pending invites.
                </td>
              </tr>
            ) : (
              data.pending.map((row) => (
                <tr key={row._id} className="border-b border-border/60">
                  <td className="py-2 pr-3">{row.email}</td>
                  <td className="py-2 pr-3 capitalize">{row.role}</td>
                  <td className="py-2 pr-3 text-muted">
                    {new Date(row.lastSentAt ?? row.invitedAt).toLocaleString()}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() => {
                          setBusy(row._id);
                          setError(null);
                          void resendInvite({ ...adminCreds, inviteId: row._id })
                            .then(() => setNotice(`Resent invite to ${row.email}`))
                            .catch((e) =>
                              setError(e instanceof Error ? e.message : "Resend failed")
                            )
                            .finally(() => setBusy(null));
                        }}
                      >
                        Resend
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => {
                          setBusy(`revoke-${row._id}`);
                          setError(null);
                          void revokeInvite({
                            ...adminCreds,
                            inviteId: row._id as Id<"adminInvites">,
                          })
                            .then(() => setNotice(`Revoked invite for ${row.email}`))
                            .catch((e) =>
                              setError(e instanceof Error ? e.message : "Revoke failed")
                            )
                            .finally(() => setBusy(null));
                        }}
                      >
                        Revoke
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
