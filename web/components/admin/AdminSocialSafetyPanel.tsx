"use client";

import { Button } from "@/components/ui/Button";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export function AdminSocialSafetyPanel({ adminSessionToken }: { adminSessionToken: string }) {
  const reports = useQuery(api.gigaSocial.listOpenSafetyReports, { adminSessionToken });
  const resolve = useMutation(api.gigaSocial.resolveSafetyReport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(reportId: Id<"socialContentReports">, decision: "dismiss" | "remove" | "reviewed") {
    setBusy(true);
    setError(null);
    try {
      await resolve({ adminSessionToken, reportId, decision });
    } catch {
      setError("Could not update this report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">GigaSocial safety reports</h2>
      {error ? <p role="alert">{error}</p> : null}
      {reports === undefined ? <p>Loading reports…</p> : reports.length === 0 ? <p>No open reports.</p> : null}
      <ul className="space-y-2">
        {reports?.map((report) => (
          <li key={report._id} className="space-y-2 rounded-xl border border-border p-3">
            <p className="font-medium capitalize">{report.reason.replaceAll("_", " ")} · {report.targetType}</p>
            <p className="break-all text-sm text-muted">Target {report.commentId ?? report.postId ?? report.profileUserId ?? report.streamId}</p>
            {report.details ? <p className="whitespace-pre-wrap break-words text-sm">{report.details}</p> : null}
            {report.postId ? <a className="text-sm text-accent underline" href={`/gigasocial/post/?id=${encodeURIComponent(report.postId)}`} target="_blank" rel="noopener noreferrer">View reported post</a> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void review(report._id, "dismiss")}>Dismiss</Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void review(report._id, "reviewed")}>Mark reviewed</Button>
              {report.targetType !== "profile" ? (
                <Button type="button" variant="secondary" disabled={busy}
                  onClick={() => {
                    if (window.confirm("Remove the reported content from GigaSocial?")) void review(report._id, "remove");
                  }}>{report.targetType === "live" ? "Stop and remove stream" : "Remove content"}</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
