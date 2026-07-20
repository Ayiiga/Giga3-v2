"use client";

import { Button } from "@/components/ui/Button";
import { formatTimestampDateTime } from "@/lib/datetime";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";

type AdminCreds = { adminSessionToken: string };

export function AdminUsersPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const users = useQuery(api.adminUsers.listUsersAdmin, {
    ...adminCreds,
    search: search.trim() || undefined,
    limit: 100,
  });
  const setAccountStatus = useMutation(api.adminUsers.setUserAccountStatus);

  const rows = useMemo(() => users ?? [], [users]);

  async function toggleSuspend(userId: Id<"users">, suspend: boolean) {
    setBusy(userId);
    onError(null);
    try {
      await setAccountStatus({
        ...adminCreds,
        userId,
        accountStatus: suspend ? "suspended" : "active",
      });
      onNotice(suspend ? "Account suspended." : "Account reactivated.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  if (users === undefined) {
    return <p className="text-sm text-muted">Loading users…</p>;
  }

  if (users === null) {
    return <p className="text-sm text-red-600">Unauthorized.</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">User management</h2>
          <p className="text-sm text-muted">Search, review subscription status, suspend or reactivate.</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or name"
          className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted">
          No users match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Credits</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{user.email}</div>
                    {user.name ? <div className="text-xs text-muted">{user.name}</div> : null}
                  </td>
                  <td className="px-4 py-3">
                    {user.subscriptionActive ? (
                      <span className="text-emerald-700">{user.plan}</span>
                    ) : (
                      <span>{user.plan}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{user.credits}</td>
                  <td className="px-4 py-3">
                    {user.accountStatus === "suspended" ? (
                      <span className="text-red-600">Suspended</span>
                    ) : user.verified ? (
                      <span className="text-emerald-700">Verified</span>
                    ) : (
                      <span className="text-muted">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {user.lastSeenAt ? formatTimestampDateTime(user.lastSeenAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {user.accountStatus === "suspended" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === user.id}
                        onClick={() => void toggleSuspend(user.id, false)}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy === user.id}
                        onClick={() => void toggleSuspend(user.id, true)}
                      >
                        Suspend
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
