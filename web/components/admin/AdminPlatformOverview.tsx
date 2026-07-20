"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

type AdminCreds = { adminSessionToken: string };

export function AdminPlatformOverview({ adminCreds }: { adminCreds: AdminCreds }) {
  const stats = useQuery(api.adminUsers.getPlatformOverview, adminCreds);

  if (stats === undefined) {
    return <p className="text-sm text-muted">Loading platform overview…</p>;
  }

  if (stats === null) {
    return null;
  }

  const cards = [
    { label: "Total users", value: stats.totalUsers },
    { label: "Active now", value: stats.activeUsers },
    { label: "Verified", value: stats.verifiedUsers },
    { label: "Premium", value: stats.premiumSubscribers },
    { label: "Free", value: stats.freeUsers },
    { label: "Suspended", value: stats.suspendedUsers },
    { label: "GigaSocial posts", value: stats.gigaSocialPosts },
    { label: "Live sessions", value: stats.liveSessions },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border bg-card p-5">
          <div className="text-sm text-muted">{card.label}</div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </section>
  );
}
