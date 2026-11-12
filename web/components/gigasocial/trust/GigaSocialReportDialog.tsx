"use client";

import { Button } from "@/components/ui/Button";
import {
  SOCIAL_CONTENT_REPORT_OPTIONS,
  SOCIAL_REPORT_ALREADY_MESSAGE,
  SOCIAL_REPORT_SUCCESS_MESSAGE,
  type SocialContentReportReasonId,
  type SocialContentReportTarget,
} from "@/lib/gigasocial/socialContentReport";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Flag, X } from "lucide-react";
import { memo, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const CYBER_CONTACTS = [
  { id: "AU", country: "Australia", agency: "Australian Signals Directorate ReportCyber", url: "https://www.cyber.gov.au/submit-a-report" },
  { id: "CA", country: "Canada", agency: "Canadian Centre for Cyber Security", url: "https://www.cyber.gc.ca/en/incident-management" },
  { id: "GH", country: "Ghana", agency: "Cyber Security Authority", url: "https://www.csa.gov.gh/report", phone: "Call or SMS 292 in Ghana." },
  { id: "NG", country: "Nigeria", agency: "ngCERT", url: "https://nccc.gov.ng/ngcert" },
  { id: "FR", country: "France", agency: "Cybermalveillance.gouv.fr complaint guidance", url: "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/deposer-plainte-cybermalveillance" },
  { id: "DE", country: "Germany", agency: "Federal Office for Information Security reporting directory", url: "https://mip2.bsi.bund.de/de/meldestellen-uebersicht/" },
  { id: "IN", country: "India", agency: "National Cyber Crime Reporting Portal", url: "https://www.cybercrime.gov.in/" },
  { id: "NZ", country: "New Zealand", agency: "National Cyber Security Centre", url: "https://www.ncsc.govt.nz/report/business-and-individuals/" },
  { id: "RW", country: "Rwanda", agency: "National Cyber Security Authority", url: "https://cyber.gov.rw/report-incident/", phone: "Call 9009 in Rwanda." },
  { id: "SG", country: "Singapore", agency: "Cyber Security Agency of Singapore", url: "https://www.csa.gov.sg/contact-us/" },
  { id: "TZ", country: "Tanzania", agency: "Tanzania Computer Emergency Response Team", url: "https://www.tzcert.go.tz/incident/report" },
  { id: "GB", country: "United Kingdom", agency: "Report Fraud", url: "https://www.reportfraud.police.uk/reporting-a-fraud/", phone: "For Scotland, call Police Scotland on 101." },
  { id: "KE", country: "Kenya", agency: "National KE-CIRT/CC", url: "https://ke-cirt.go.ke/contact-us/" },
  { id: "ZA", country: "South Africa", agency: "Cybersecurity Hub", url: "https://www.cybersecurityhub.gov.za/report-incident" },
  { id: "US", country: "United States", agency: "FBI Internet Crime Complaint Center", url: "https://www.ic3.gov/" },
] as const;

const sortedCyberContacts = [...CYBER_CONTACTS].sort((a, b) => a.country.localeCompare(b.country, "en"));

type GigaSocialReportDialogProps = {
  open: boolean;
  sessionToken: string | null;
  target: SocialContentReportTarget | null;
  title?: string;
  onClose: () => void;
  onRequireAuth?: () => void;
  onSubmitted?: (message: string) => void;
};

export const GigaSocialReportDialog = memo(function GigaSocialReportDialog({
  open,
  sessionToken,
  target,
  title = "Report",
  onClose,
  onRequireAuth,
  onSubmitted,
}: GigaSocialReportDialogProps) {
  const reportSocialContent = useMutation(api.gigaSocial.reportSocialContent);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState<SocialContentReportReasonId>("spam");
  const [details, setDetails] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setReason("spam");
    setDetails("");
    setCountry("");
    setError(null);
    setSubmitting(false);
  }, [open, target]);

  if (!mounted || !open || !target) return null;
  const countryContact = CYBER_CONTACTS.find((contact) => contact.id === country);

  async function handleSubmit() {
    if (!sessionToken) {
      onRequireAuth?.();
      return;
    }
    if (!target || submitting) return;
    const activeTarget = target;
    setSubmitting(true);
    setError(null);
    try {
      const result = await reportSocialContent({
        sessionToken,
        targetType: activeTarget.targetType,
        postId:
          activeTarget.targetType === "post"
            ? (activeTarget.postId as Id<"socialPosts">)
            : undefined,
        commentId:
          activeTarget.targetType === "comment"
            ? (activeTarget.commentId as Id<"socialComments">)
            : undefined,
        profileUserId:
          activeTarget.targetType === "profile"
            ? activeTarget.profileUserId
            : undefined,
        streamId: activeTarget.targetType === "live" ? activeTarget.streamId as Id<"socialLiveStreams"> : undefined,
        reason,
        details: details.trim() || undefined,
      });
      const message = result.alreadyReported
        ? SOCIAL_REPORT_ALREADY_MESSAGE
        : SOCIAL_REPORT_SUCCESS_MESSAGE;
      onSubmitted?.(message);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Flag className="h-4 w-4 shrink-0 text-red-700" aria-hidden />
            <h2 id={titleId} className="text-base font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full text-muted hover:bg-muted/40"
            onClick={onClose}
            aria-label="Close report dialog"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          This sends a report to the GigaSocial team. Child safety and sexual content reports are prioritised.
        </p>

        <details className="mt-3 rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Report to a national cybersecurity agency</summary>
          <p className="mt-2 text-muted">Contact the agency directly. GigaSocial keeps this report within the platform.</p>
          <label className="mt-2 block">
            Country
            <select className="mt-1 block w-full rounded-lg border border-border bg-background p-2" value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="">Select a country</option>
              {sortedCyberContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.country}</option>)}
              <option value="other">Another country</option>
            </select>
          </label>
          {countryContact ? (
            <p className="mt-2">
              <a className="text-accent underline" href={countryContact.url} target="_blank" rel="noopener noreferrer">{countryContact.agency}</a>
              {"phone" in countryContact ? ` · ${countryContact.phone}` : ""}
            </p>
          ) : country === "other" ? (
            <p className="mt-2 text-muted">Use the directory below to look up your national response team.</p>
          ) : null}
          <a className="mt-2 inline-block text-accent underline" href="https://www.itu.int/en/ITU-D/Cybersecurity/Pages/CIRTs/List-of-National-CIRTs.aspx" target="_blank" rel="noopener noreferrer">Find national response teams in the ITU directory</a>
        </details>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-foreground">Reason</legend>
          {SOCIAL_CONTENT_REPORT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm",
                reason === option.id
                  ? "border-accent bg-accent/5 text-foreground"
                  : "border-border text-foreground"
              )}
            >
              <input
                type="radio"
                name="gigasocial-report-reason"
                value={option.id}
                checked={reason === option.id}
                onChange={() => setReason(option.id)}
                className="accent-[var(--accent,#0f766e)]"
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label className="mt-4 block text-sm">
          <span className="font-medium text-foreground">Details (optional)</span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
            rows={3}
            className="mt-1 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            placeholder="Describe what happened. Keep passwords and private images out of the report."
          />
        </label>

        {error ? (
          <p className="mt-3 text-xs text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="min-h-10"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
});
