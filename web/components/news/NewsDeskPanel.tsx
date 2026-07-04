"use client";

import { Button } from "@/components/ui/Button";
import { formatTimestampDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { ExternalLink, Newspaper, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";

type NewsHeadline = {
  title: string;
  link: string;
  publishedAt: string | null;
  source: string;
  platform: string;
};

type VerificationResult = {
  verdict: "authentic" | "unverified" | "misinformation";
  confidence: "high" | "medium" | "low";
  summary: string;
  reasons: string[];
  trustedSources: Array<{ title: string; uri: string }>;
  checkedAt: number;
};

const VERDICT_LABEL: Record<VerificationResult["verdict"], string> = {
  authentic: "Likely authentic",
  unverified: "Unverified",
  misinformation: "Likely misinformation",
};

const VERDICT_CLASS: Record<VerificationResult["verdict"], string> = {
  authentic: "text-emerald-700 bg-emerald-500/10",
  unverified: "text-amber-800 bg-amber-500/10",
  misinformation: "text-red-700 bg-red-500/10",
};

export function NewsDeskPanel({
  sessionToken,
  variant = "marketplace",
}: {
  sessionToken: string;
  variant?: "marketplace" | "chat";
}) {
  const fetchLatestNews = useAction(api.creatorNews.fetchLatestNews);
  const verifyNewsClaim = useAction(api.creatorNews.verifyNewsClaim);
  const embedded = variant === "chat";

  const [headlines, setHeadlines] = useState<NewsHeadline[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [claim, setClaim] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setError(null);
    setLoadingNews(true);
    try {
      const result = await fetchLatestNews({ sessionToken, limitPerFeed: 3 });
      setHeadlines(result.headlines as NewsHeadline[]);
      setFetchedAt(result.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load news.");
    } finally {
      setLoadingNews(false);
    }
  }, [fetchLatestNews, sessionToken]);

  async function runVerification(headline: string, link?: string) {
    setError(null);
    setVerifying(true);
    setClaim(headline);
    if (link) setSourceUrl(link);
    try {
      const result = await verifyNewsClaim({
        sessionToken,
        claim: headline,
        sourceUrl: link,
      });
      setVerification(result as VerificationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setVerification(null);
    } finally {
      setVerifying(false);
    }
  }

  const title =
    variant === "chat" ? "Latest news & fact-check" : "Latest news & social headlines";
  const subtitle =
    variant === "chat"
      ? "Load headlines from news and social feeds, then verify claims before you share or cite them."
      : "Read headlines from major news outlets and social discussion feeds. Verify claims before you reference them in your products.";

  return (
    <section
      className={cn(
        embedded ? "px-3 py-4 sm:px-4" : "rounded-2xl border bg-card p-6"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div
            className={cn(
              "mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-800",
              embedded && "text-xs"
            )}
          >
            <Newspaper className="h-4 w-4" aria-hidden />
            {variant === "chat" ? "Giga3 news desk" : "Creator news desk"}
          </div>
          <h2 className={cn("font-semibold", embedded ? "text-base" : "text-lg")}>
            {title}
          </h2>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          {fetchedAt && (
            <p className="mt-1 text-xs text-muted">
              Updated {formatTimestampDateTime(fetchedAt)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void loadNews()}
          disabled={loadingNews}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loadingNews ? "animate-spin" : ""}`}
            aria-hidden
          />
          {loadingNews ? "Loading…" : "Load latest"}
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {headlines.length > 0 && (
        <ul className="mt-4 space-y-3">
          {headlines.map((item) => (
            <li
              key={`${item.source}-${item.link}`}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
                  {item.platform}
                </span>
                <span>{item.source}</span>
                {item.publishedAt && <span>· {item.publishedAt}</span>}
              </div>
              <p className="mt-2 text-sm font-medium text-foreground">{item.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Open source
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void runVerification(item.title, item.link)}
                  disabled={verifying}
                >
                  <ShieldCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Verify
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={cn("mt-6 border-t border-border pt-6", embedded && "mt-4 pt-4")}>
        <h3 className="text-base font-semibold">Verify a headline or post</h3>
        <p className="mt-1 text-sm text-muted">
          Paste any news headline or social media claim to check it against credible sources.
        </p>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={embedded ? 2 : 3}
          placeholder="Paste a headline, tweet, or post to fact-check…"
          className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"
        />
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="Source URL (optional)"
          className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"
        />
        <Button
          type="button"
          className="mt-3"
          onClick={() => void runVerification(claim, sourceUrl || undefined)}
          disabled={verifying || claim.trim().length < 8}
        >
          {verifying ? "Checking sources…" : "Verify authenticity"}
        </Button>
      </div>

      {verification && (
        <div className="mt-6 rounded-xl border border-border bg-background p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${VERDICT_CLASS[verification.verdict]}`}
            >
              {VERDICT_LABEL[verification.verdict]}
            </span>
            <span className="text-xs text-muted capitalize">
              Confidence: {verification.confidence}
            </span>
            <span className="text-xs text-muted">
              · {formatTimestampDateTime(verification.checkedAt)}
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground">{verification.summary}</p>
          {verification.reasons.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {verification.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {verification.trustedSources.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Sources checked
              </p>
              <ul className="mt-2 space-y-1">
                {verification.trustedSources.map((source) => (
                  <li key={source.uri}>
                    <a
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
