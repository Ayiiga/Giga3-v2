"use client";

import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

type AdminCreds = { adminSessionToken: string };

export function AdminFoundingMembersPanel({
  adminCreds,
}: {
  adminCreds: AdminCreds;
}) {
  const audit = useQuery(api.foundingMembersOffer.adminOfferAudit, adminCreds);

  if (audit === undefined) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Founding Members offer</h2>
        <p className="mt-2 text-sm text-muted">Loading…</p>
      </section>
    );
  }

  if (audit === null) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5"
      data-testid="admin-founding-members"
    >
      <h2 className="text-lg font-bold text-slate-900">
        Founding Members — Teacher Promotion Premium
      </h2>
      <p className="mt-1 text-sm text-muted">
        GHS {audit.priceGhs} · max {audit.maxAllocations} · access {audit.accessDurationLabel} ·
        live checkout {audit.liveCheckoutEnabled ? "ON" : "OFF"}
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">Paid</dt>
          <dd className="text-xl font-bold text-slate-900">{audit.paidCount}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">Reserved</dt>
          <dd className="text-xl font-bold text-slate-900">{audit.reservedActiveCount}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">Remaining</dt>
          <dd className="text-xl font-bold text-slate-900">{audit.remaining}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase text-slate-500">Offer</dt>
          <dd className="truncate text-sm font-semibold text-slate-800">{audit.offerId}</dd>
        </div>
      </dl>

      <h3 className="mt-5 text-sm font-bold text-slate-800">Slots</h3>
      <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-100">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">Status</th>
              <th className="px-2 py-1.5">User</th>
              <th className="px-2 py-1.5">Reference</th>
              <th className="px-2 py-1.5">Paid at</th>
            </tr>
          </thead>
          <tbody>
            {audit.slots.map((s) => (
              <tr key={s.slotIndex} className="border-t border-slate-100">
                <td className="px-2 py-1.5">{s.slotIndex}</td>
                <td className="px-2 py-1.5">{s.status}</td>
                <td className="px-2 py-1.5">{s.userId ?? "—"}</td>
                <td className="px-2 py-1.5 font-mono">{s.paymentReference ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {s.paidAt
                    ? new Date(s.paidAt).toLocaleString("en-GB", {
                        timeZone: "Africa/Accra",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-bold text-slate-800">Recent events</h3>
      <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-700">
        {audit.recentEvents.map((e, i) => (
          <li key={`${e.createdAt}-${i}`} className="rounded-lg bg-slate-50 px-2 py-1.5">
            <span className="font-semibold">{e.eventType}</span>
            {e.userId ? ` · ${e.userId}` : ""}
            {e.paymentReference ? ` · ${e.paymentReference}` : ""}
            <span className="text-slate-500">
              {" "}
              ·{" "}
              {new Date(e.createdAt).toLocaleString("en-GB", {
                timeZone: "Africa/Accra",
              })}
            </span>
          </li>
        ))}
        {audit.recentEvents.length === 0 ? (
          <li className="text-muted">No events yet.</li>
        ) : null}
      </ul>
    </section>
  );
}
