"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import {
  certificatePdfFilename,
  generateAcademyCertificatePdf,
} from "@/lib/gigalearn/academy/certificatePdf";
import { siteConfig } from "@/lib/site";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function CertificatesInner() {
  const params = useSearchParams();
  const courseSlug = (params.get("course") || "").trim().toLowerCase();
  const sessionToken = getSessionToken();

  const list = useQuery(
    api.gigaLearnAcademyCertificates.listMyCertificates,
    sessionToken ? { sessionToken } : "skip"
  );
  const eligibility = useQuery(
    api.gigaLearnAcademyCertificates.getCertificateEligibility,
    sessionToken && courseSlug ? { sessionToken, courseSlug } : "skip"
  );
  const issue = useMutation(api.gigaLearnAcademyCertificates.issueCertificate);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <AcademyChrome active="my" title="Academy certificates">
        <ProductSignInPrompt
          productName="GigaLearn Academy"
          description="Sign in to view and download certificates you have earned."
          nextPath="/gigalearn/academy/certificates/"
        />
      </AcademyChrome>
    );
  }

  async function onIssue() {
    if (!sessionToken || !courseSlug) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await issue({ sessionToken, courseSlug });
      setMessage(
        res.duplicate
          ? `Certificate already issued (${res.publicId}). Re-download from your list — no duplicate created.`
          : `Certificate issued: ${res.publicId}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Issuance failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(publicId: string) {
    if (!sessionToken) return;
    setBusy(true);
    setError(null);
    try {
      const { ConvexHttpClient } = await import("convex/browser");
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) throw new Error("Convex URL not configured.");
      const client = new ConvexHttpClient(url);
      const payload = await client.query(
        api.gigaLearnAcademyCertificates.getMyCertificateForDownload,
        { sessionToken, publicId }
      );
      if (!payload) throw new Error("Certificate not available for download.");
      const pdf = await generateAcademyCertificatePdf({
        ...payload,
        siteOrigin: siteConfig.url,
      });
      const blob = new Blob([pdf], { type: "application/pdf" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = certificatePdfFilename(publicId);
      a.click();
      URL.revokeObjectURL(href);
      setMessage("Download started. Re-download never creates a new certificate.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AcademyChrome
      active="my"
      title="Academy certificates"
      subtitle="Certificates are issued only when server-side completion requirements are met. Tutoring alone never earns a certificate."
    >
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/gigalearn/academy/my/" variant="outline" className="min-h-11">
          My courses
        </ButtonLink>
        <ButtonLink href="/gigalearn/academy/verify/" variant="outline" className="min-h-11">
          Public verify
        </ButtonLink>
      </div>

      {courseSlug ? (
        <section className="saas-card space-y-3 rounded-2xl border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">
            Eligibility — {eligibility?.courseTitle ?? courseSlug}
          </h2>
          {eligibility === undefined ? (
            <ClientAppHydrationNotice productName="GigaLearn Academy" />
          ) : eligibility.eligible ? (
            <p className="text-sm text-muted">
              You meet the server-verified requirements
              {eligibility.existingCertificatePublicId
                ? ` · existing certificate ${eligibility.existingCertificatePublicId}`
                : ""}
              .
            </p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {eligibility.missing.map((m: { detail: string }, i: number) => (
                <li key={`${i}-${m.detail}`}>{m.detail}</li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            className="min-h-11"
            disabled={busy || !eligibility?.eligible}
            onClick={() => void onIssue()}
          >
            {busy ? "Working…" : "Issue certificate"}
          </Button>
        </section>
      ) : (
        <p className="text-sm text-muted">
          Open a course and use <span className="font-medium">Certificates</span> to check
          eligibility, or download from your list below.
        </p>
      )}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <section className="saas-card space-y-3 rounded-2xl border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">Your certificates</h2>
        {list === undefined ? (
          <ClientAppHydrationNotice productName="GigaLearn Academy" />
        ) : list.length === 0 ? (
          <p className="text-sm text-muted">No certificates yet.</p>
        ) : (
          <ul className="space-y-2">
            {list.map(
              (c: {
                publicId: string;
                courseTitle: string;
                status: string;
                issuedAt: number;
                verificationUrl: string;
              }) => (
                <li
                  key={c.publicId}
                  className="flex flex-col gap-2 rounded-xl border border-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.courseTitle}</p>
                    <p className="text-xs text-muted">
                      {c.publicId} · {c.status} ·{" "}
                      {new Date(c.issuedAt).toLocaleDateString()}
                    </p>
                    <Link
                      href={`/gigalearn/academy/verify/?c=${encodeURIComponent(c.publicId)}`}
                      className="text-xs font-semibold text-accent"
                    >
                      Verification page
                    </Link>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    disabled={busy}
                    onClick={() => void onDownload(c.publicId)}
                  >
                    Download PDF
                  </Button>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </AcademyChrome>
  );
}

export function AcademyCertificatesPanel() {
  return (
    <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
      <CertificatesInner />
    </Suspense>
  );
}
