"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimestampDateTime } from "@/lib/datetime";
import type { WalletDashboard } from "@/lib/wallet/types";
import { BarChart3 } from "lucide-react";

type CreditLogRow = {
  _id: string;
  action: string;
  amount: number;
  balanceAfter: number;
  createdAt: number;
  reference?: string;
};

type VideoCreditLogRow = {
  _id: string;
  action: string;
  amount: number;
  balanceAfter: number;
  createdAt: number;
  reference?: string;
};

type WalletUsagePanelProps = {
  dashboard: WalletDashboard;
  creditLogs: CreditLogRow[] | undefined;
  videoCreditLogs: VideoCreditLogRow[] | undefined;
};

function actionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

export function WalletUsagePanel({
  dashboard,
  creditLogs,
  videoCreditLogs,
}: WalletUsagePanelProps) {
  const costs = dashboard.creditCosts;

  return (
    <div className="space-y-8">
      <section className="glass rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold">Credit costs</h2>
        <p className="mt-1 text-sm text-muted">
          All deductions are validated on the server before AI runs.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            Object.entries(costs) as Array<[string, number]>
          ).map(([key, value]) => (
            <div
              key={key}
              className="rounded-xl border border-border px-3 py-2 text-sm"
            >
              <dt className="capitalize text-muted">{key}</dt>
              <dd className="text-lg font-bold">{value} cr.</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Chat credit log</h2>
        {!creditLogs || creditLogs.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={BarChart3}
            title="No chat credit activity"
            description="Send a message or generate media to see usage here."
          />
        ) : (
          <div className="mt-4 space-y-2">
            {creditLogs.map((row) => (
              <div
                key={row._id}
                className="flex flex-col gap-1 rounded-xl border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium capitalize">
                    {actionLabel(row.action)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatTimestampDateTime(row.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      row.amount < 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"
                    }
                  >
                    {row.amount > 0 ? "+" : ""}
                    {row.amount} cr.
                  </p>
                  <p className="text-xs text-muted">
                    Balance {row.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Video credit log</h2>
        {!videoCreditLogs || videoCreditLogs.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={BarChart3}
            title="No video credit activity"
            description="Generate a video in Video AI to see deductions and refunds."
          />
        ) : (
          <div className="mt-4 space-y-2">
            {videoCreditLogs.map((row) => (
              <div
                key={row._id}
                className="flex flex-col gap-1 rounded-xl border border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium capitalize">
                    {actionLabel(row.action)}
                  </p>
                  <p className="text-xs text-muted">
                    {formatTimestampDateTime(row.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {row.amount > 0 ? "+" : ""}
                    {row.amount} video cr.
                  </p>
                  <p className="text-xs text-muted">
                    Balance {row.balanceAfter}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
