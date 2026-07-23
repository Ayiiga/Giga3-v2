"use client";

import { Button } from "@/components/ui/Button";
import type { FeedbackPriority, FeedbackStatus } from "@/lib/platform/types";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Inbox } from "lucide-react";
import { useState } from "react";

type AdminCreds = { adminSessionToken: string };

const STATUSES: FeedbackStatus[] = ["open", "reviewing", "resolved", "closed"];
const PRIORITIES: FeedbackPriority[] = ["critical", "high", "normal", "low"];

export function AdminPhase5FeedbackPanel({
  adminCreds,
  onNotice,
  onError,
}: {
  adminCreds: AdminCreds;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<FeedbackStatus>("open");
  const dashboard = useQuery(api.platformFeedback.listFeedbackDashboardAdmin, {
    ...adminCreds,
    status,
  });
  const update = useMutation(api.platformFeedback.updateFeedbackStatus);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (dashboard === undefined) {
    return <p className="text-sm text-muted">Loading feedback dashboard…</p>;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
          <Inbox className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Feedback resolution workflow</h2>
          <p className="mt-1 text-sm text-muted">
            Priority-ranked queue for bugs, feature ideas, AI ratings, and content
            reports. Internal details stay admin-only.
            {!dashboard.phase5FeedbackEnabled && (
              <>
                {" "}
                Expanded types activate when{" "}
                <code className="text-xs">phase5.feedback</code> is enabled.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Open" value={dashboard.counts.open} />
        <Stat label="Reviewing" value={dashboard.counts.reviewing} />
        <Stat label="Resolved (sample)" value={dashboard.counts.resolved} />
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs ${
              status === s ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {dashboard.items.map((item) => (
          <li key={item._id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                {item.priority}
              </span>
              <span className="text-muted">{item.type}</span>
              <span className="text-muted">{item.status}</span>
            </div>
            <h3 className="mt-2 font-medium">{item.title}</h3>
            <p className="mt-1 text-sm text-muted">{item.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUSES.filter((s) => s !== item.status).map((next) => (
                <Button
                  key={next}
                  size="sm"
                  variant="secondary"
                  disabled={busyId === item._id}
                  onClick={() => {
                    void (async () => {
                      setBusyId(item._id);
                      onError("");
                      try {
                        await update({
                          ...adminCreds,
                          feedbackId: item._id as Id<"userFeedbackSubmissions">,
                          status: next,
                        });
                        onNotice(`Marked “${item.title}” as ${next}.`);
                      } catch (e) {
                        onError(
                          e instanceof Error ? e.message : "Could not update feedback."
                        );
                      } finally {
                        setBusyId(null);
                      }
                    })();
                  }}
                >
                  → {next}
                </Button>
              ))}
              {PRIORITIES.filter((p) => p !== item.priority).slice(0, 2).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant="ghost"
                  disabled={busyId === item._id}
                  onClick={() => {
                    void (async () => {
                      setBusyId(item._id);
                      try {
                        await update({
                          ...adminCreds,
                          feedbackId: item._id as Id<"userFeedbackSubmissions">,
                          status: item.status,
                          priority: p,
                        });
                        onNotice(`Priority set to ${p}.`);
                      } catch (e) {
                        onError(
                          e instanceof Error ? e.message : "Could not set priority."
                        );
                      } finally {
                        setBusyId(null);
                      }
                    })();
                  }}
                >
                  {p}
                </Button>
              ))}
            </div>
          </li>
        ))}
        {dashboard.items.length === 0 && (
          <li className="text-sm text-muted">No feedback in this status.</li>
        )}
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
