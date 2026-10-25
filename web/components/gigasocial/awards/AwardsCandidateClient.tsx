"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { getSessionToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import {
  candidateSharePath,
  TIP_DISCLAIMER,
} from "@/lib/gigasocial/awards/constants";

function CandidateInner() {
  const params = useMemo(() => {
    if (typeof window === "undefined") return { code: "", token: "" };
    const sp = new URLSearchParams(window.location.search);
    return {
      code: (sp.get("code") || "").trim().toUpperCase(),
      token: (sp.get("t") || "").trim(),
    };
  }, []);

  const sessionToken = useMemo(() => getSessionToken(), []);
  const candidate = useQuery(api.gigaSocialAwards.getPublicCandidate, {
    displayCode: params.code || undefined,
    shareToken: params.token || undefined,
  });
  const castVote = useMutation(api.gigaSocialAwards.castVote);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!params.code && !params.token) {
    return (
      <p className="text-sm text-muted">
        Add a candidate code to the URL, for example{" "}
        <code className="text-xs">?code=GSA-2026-00001</code>.
      </p>
    );
  }

  if (candidate === undefined) return <LoadingState label="Loading candidate…" />;
  if (!candidate) {
    return <p className="text-sm text-muted">Candidate not found.</p>;
  }
  if (candidate.unavailable) {
    return <p className="text-sm text-muted">{candidate.reason}</p>;
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${candidateSharePath({
          displayCode: candidate.displayCode,
          shareToken: candidate.shareToken,
        })}`
      : candidateSharePath({
          displayCode: candidate.displayCode,
          shareToken: candidate.shareToken,
        });

  const onVote = async () => {
    if (!sessionToken) {
      setMsg("Sign in to cast your free vote.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await castVote({ sessionToken, candidateId: candidate.candidateId });
      setMsg("Vote recorded. Thank you.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not record vote.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {candidate.displayCode}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{candidate.displayName}</h1>
        <p className="text-sm text-muted">
          {candidate.category.name} · {candidate.season.title}
        </p>
        {candidate.verifiedCreator ? (
          <p className="text-xs text-emerald-700">Verified creator profile</p>
        ) : null}
      </header>

      <p className="text-sm leading-relaxed text-foreground">{candidate.biography}</p>

      {candidate.portfolioLinks.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {candidate.portfolioLinks.map((href) => (
            <li key={href}>
              <a
                href={href}
                className="text-accent underline"
                rel="noopener noreferrer"
                target="_blank"
              >
                {href}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold">Scoring criteria</h2>
        <p className="mt-1 text-sm text-muted">
          {candidate.scoringCriteria.peoplesChoice
            ? "People’s Choice: public voting only (100%)."
            : `Public voting ${candidate.scoringCriteria.publicVoteWeight}% · Judging ${candidate.scoringCriteria.judgingWeight}% · Category assessment ${candidate.scoringCriteria.assessmentWeight}%.`}
        </p>
        {candidate.votingClosesAt ? (
          <p className="mt-2 text-xs text-muted">
            Voting closes {new Date(candidate.votingClosesAt).toLocaleString()}
          </p>
        ) : null}
        {candidate.voteCount !== null ? (
          <p className="mt-2 text-sm">Verified votes shown: {candidate.voteCount}</p>
        ) : (
          <p className="mt-2 text-xs text-muted">Vote totals publish when authorised.</p>
        )}
        <Button
          type="button"
          className="mt-3 min-h-11"
          disabled={!candidate.votingOpen || busy}
          onClick={() => void onVote()}
        >
          {candidate.votingOpen ? (busy ? "Recording…" : "Cast free vote") : "Voting closed"}
        </Button>
        {msg ? <p className="mt-2 text-sm text-muted">{msg}</p> : null}
      </section>

      <section className="rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold">Share</h2>
        <p className="mt-1 break-all text-xs text-muted">{shareUrl}</p>
        <Button
          type="button"
          size="sm"
          className="mt-2"
          onClick={() => void navigator.clipboard?.writeText(shareUrl)}
        >
          Copy voting link
        </Button>
      </section>

      {candidate.tipsEnabled ? (
        <section className="rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold">Support the creator</h2>
          <p className="mt-1 text-xs text-muted">{TIP_DISCLAIMER}</p>
          <p className="mt-2 text-sm text-muted">
            Use GigaSocial creator tip tools when available. Tips never affect rankings.
          </p>
        </section>
      ) : (
        <p className="text-xs text-muted">Creator tips are not enabled for this season.</p>
      )}

      <p className="text-xs text-muted">{candidate.operatorDisclosure}</p>
    </article>
  );
}

export function AwardsCandidateClient() {
  return (
    <ConvexAppShell>
      <CandidateInner />
    </ConvexAppShell>
  );
}
