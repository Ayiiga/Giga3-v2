"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { Button } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyInner() {
  const params = useSearchParams();
  const initial = (params.get("c") || "").trim();
  const [publicId, setPublicId] = useState(initial);
  const [submitted, setSubmitted] = useState(initial);
  const recordHit = useMutation(api.gigaLearnAcademyCertificates.recordVerifyHit);

  const result = useQuery(
    api.gigaLearnAcademyCertificates.verifyCertificatePublic,
    submitted ? { publicId: submitted, clientBucket: "web" } : "skip"
  );

  useEffect(() => {
    if (!submitted || !result || result.rateLimited) return;
    void recordHit({ publicId: submitted, clientBucket: "web" }).catch(() => {
      /* non-fatal */
    });
  }, [submitted, result, recordHit]);

  return (
    <AcademyChrome
      active="catalogue"
      title="Verify a certificate"
      subtitle="Public verification shows only course, issuer, dates, status, and a privacy-safe learner display name. Email and assessment details are never shown."
    >
      <form
        className="saas-card flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(publicId.trim());
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          <span className="mb-1 block font-medium text-foreground">Certificate ID</span>
          <input
            className="min-h-11 w-full rounded-xl border border-border px-3 text-sm"
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            placeholder="gla_…"
            autoComplete="off"
          />
        </label>
        <Button type="submit" className="min-h-11">
          Verify
        </Button>
      </form>

      {submitted ? (
        result === undefined ? (
          <ClientAppHydrationNotice productName="GigaLearn Academy" />
        ) : result.rateLimited ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            Too many verification requests. Please wait a moment and try again.
          </p>
        ) : !result.found ? (
          <p className="rounded-xl border border-border px-3 py-2 text-sm text-muted">
            No authentic certificate was found for this identifier.
          </p>
        ) : (
          <section className="saas-card space-y-2 rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              {result.status === "revoked" ? "Revoked certificate" : "Authentic certificate"}
            </p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Status</dt>
                <dd className="font-medium text-foreground">{result.status}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Certificate ID</dt>
                <dd className="font-medium text-foreground">{result.publicId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Course</dt>
                <dd className="font-medium text-foreground">{result.courseTitle}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Issuing organization</dt>
                <dd className="font-medium text-foreground">{result.issuingOrganization}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Learner</dt>
                <dd className="font-medium text-foreground">{result.learnerDisplayName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Issue date</dt>
                <dd className="font-medium text-foreground">
                  {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString() : "—"}
                </dd>
              </div>
              {result.status === "valid" && result.finalGrade != null ? (
                <div>
                  <dt className="text-xs text-muted">Final grade</dt>
                  <dd className="font-medium text-foreground">{result.finalGrade}%</dd>
                </div>
              ) : null}
              {result.status === "revoked" && result.revokedAt ? (
                <div>
                  <dt className="text-xs text-muted">Revoked</dt>
                  <dd className="font-medium text-foreground">
                    {new Date(result.revokedAt).toLocaleDateString()}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="text-xs text-muted">
              This page never displays email addresses, assessment answers, or private learning
              history. GigaLearn Academy certificates are issued by Giga3 AI and are not an external
              accreditation unless separately stated.
            </p>
          </section>
        )
      ) : null}
    </AcademyChrome>
  );
}

export function AcademyVerifyPanel() {
  return (
    <Suspense fallback={<ClientAppHydrationNotice productName="GigaLearn Academy" />}>
      <VerifyInner />
    </Suspense>
  );
}
