"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimestampDateTime } from "@/lib/datetime";
import { formatGhs } from "@/lib/payments/plans";
import type { WalletTransaction, ClientPaymentView } from "@/lib/wallet/types";
import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

function statusClass(status: string): string {
  switch (status) {
    case "completed":
    case "success":
      return "bg-emerald-500/10 text-emerald-700";
    case "pending":
      return "bg-amber-500/10 text-amber-700";
    default:
      return "bg-red-500/10 text-red-700";
  }
}

function formatAmount(
  amount: number,
  unit: WalletTransaction["amountUnit"]
): string {
  if (unit === "ghs") return formatGhs(amount);
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount} ${unit === "video_credits" ? "video cr." : "cr."}`;
}

type WalletBillingPanelProps = {
  payments: ClientPaymentView[];
  transactions: WalletTransaction[];
};

export function WalletBillingPanel({
  payments,
  transactions,
}: WalletBillingPanelProps) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold">Billing history</h2>
        <p className="mt-1 text-sm text-muted">
          Paystack payments — fulfilled only after server verification.
        </p>
        {payments.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Receipt}
            title="No payments yet"
            description="Subscription and credit pack purchases appear here after checkout."
          />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/10 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.reference} className="border-b border-border/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatTimestampDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {payment.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatGhs(payment.amountGhs)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          statusClass(payment.status)
                        )}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">
                      {payment.reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">All wallet activity</h2>
        <p className="mt-1 text-sm text-muted">
          Credits, video credits, and payments in one timeline.
        </p>
        {transactions.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Receipt}
            title="No transactions yet"
            description="Usage deductions and purchases will show up here."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {transactions.map((row) => (
              <article
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {formatTimestampDateTime(row.createdAt)}
                    {row.referenceId ? ` · ${row.referenceId}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {formatAmount(row.amount, row.amountUnit)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      statusClass(row.status)
                    )}
                  >
                    {row.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
