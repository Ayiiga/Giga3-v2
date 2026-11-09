"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, usePaginatedQuery } from "convex/react";
import { useEffect, useState } from "react";

export function AdminCopyrightReviewPanel() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { setSessionToken(getSessionToken()); }, []);
  const { results, status, loadMore } = usePaginatedQuery(
    api.gigaSocialEconomy.listCopyrightReviewQueue,
    sessionToken ? { sessionToken } : "skip",
    { initialNumItems: 20 }
  );
  const review = useMutation(api.gigaSocialEconomy.reviewCopyrightDeclaration);

  async function decide(postId: Id<"socialPosts">, decision: "clear" | "possible_match" | "rejected") {
    if (!sessionToken) return;
    setBusy(postId);
    setMessage("");
    try {
      await review({ sessionToken, postId, decision, note: notes[postId] ?? "" });
      setMessage("Review decision saved. Refresh to update the queue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4" aria-label="Copyright screening queue">
      <h2 className="text-lg font-semibold">GigaSocial copyright screening</h2>
      <p className="text-sm text-muted">Independent reviewer decisions are required before declared posts count toward creator eligibility. Enter a rationale of at least five characters.</p>
      {!sessionToken ? <p className="text-sm text-muted">Sign in with your platform account to review declarations.</p> : null}
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      {results.map((item) => (
        <article key={item.postId} className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-semibold">{item.creatorId} · {item.status}</p>
          <p className="text-sm">{item.body}</p>
          <p className="text-xs text-muted">Declaration: {item.declaration} {item.licenseReference ? `· Licence: ${item.licenseReference}` : ""}</p>
          <label className="block text-sm">Review rationale
            <textarea className="mt-1 w-full rounded-lg border bg-background p-2" value={notes[item.postId] ?? ""} onChange={(event) => setNotes((previous) => ({ ...previous, [item.postId]: event.target.value }))} />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["clear", "possible_match", "rejected"] as const).map((decision) => (
              <button key={decision} type="button" className="rounded-lg border px-3 py-2 text-sm" disabled={busy !== null || (notes[item.postId] ?? "").trim().length < 5} onClick={() => void decide(item.postId, decision)}>
                {decision === "clear" ? "Clear" : decision === "possible_match" ? "Flag possible match" : "Reject"}
              </button>
            ))}
          </div>
        </article>
      ))}
      {sessionToken && status === "LoadingFirstPage" ? <p>Loading review queue…</p> : null}
      {sessionToken && status === "CanLoadMore" ? <button type="button" className="rounded-lg border px-4 py-2" onClick={() => loadMore(20)}>Load more declarations</button> : null}
    </section>
  );
}
