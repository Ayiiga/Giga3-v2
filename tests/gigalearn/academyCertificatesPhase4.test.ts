/**
 * GigaLearn Academy Phase 4 — certificates, eligibility, PDF/QR, privacy.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildVerificationUrl,
  evaluateCertificateEligibility,
  getCertificatePolicy,
  modulesCompletedFromLessons,
  policyAssessmentIdsExist,
  publicDisplayName,
} from "../../web/lib/gigalearn/academy/certificatePolicy";
import {
  buildCertificateQrDataUrl,
  generateAcademyCertificatePdf,
} from "../../web/lib/gigalearn/academy/certificatePdf";
import { GIGALEARN_PRIMARY_AREAS } from "../../web/lib/gigalearn/sections";
import { gradeObjectiveSubmission, getBuiltinAssessment } from "../../web/lib/gigalearn/academy/assessmentCatalog";

const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("Academy Phase 4 eligibility", () => {
  it("rejects incomplete requirements and accepts a fully satisfied BECE path", () => {
    const incomplete = evaluateCertificateEligibility({
      courseSlug: "bece-maths-foundations",
      certificateEligible: true,
      enrolmentStatus: "active",
      completedLessonIds: ["l1-overview"],
      completedModuleIds: [],
      passedAssessmentScores: {},
      instructorApproved: false,
      projectApproved: false,
    });
    expect(incomplete.eligible).toBe(false);
    expect(incomplete.missing.some((m) => m.kind === "required_assessments")).toBe(true);

    const lessons = ["l1-overview", "l1-practice", "l2-practice", "l3-revision"];
    const modules = modulesCompletedFromLessons("bece-maths-foundations", lessons);
    const complete = evaluateCertificateEligibility({
      courseSlug: "bece-maths-foundations",
      certificateEligible: true,
      enrolmentStatus: "active",
      completedLessonIds: lessons,
      completedModuleIds: modules,
      passedAssessmentScores: {
        "bece-maths-m1-quiz": 100,
        "bece-maths-m2-quiz": 80,
        "bece-maths-final": 80,
      },
      instructorApproved: false,
      projectApproved: false,
    });
    expect(complete.eligible).toBe(true);
    expect(complete.finalScore).toBe(80);
  });

  it("ignores forged client completion when assessments/lessons are missing", () => {
    // Simulates a client claiming completion without server-held passes.
    const forged = evaluateCertificateEligibility({
      courseSlug: "bece-maths-foundations",
      certificateEligible: true,
      enrolmentStatus: "completed", // client-ish status alone is insufficient
      completedLessonIds: [],
      completedModuleIds: ["m1-numbers", "m2-algebra", "m3-revision"],
      passedAssessmentScores: {},
      instructorApproved: false,
      projectApproved: false,
    });
    expect(forged.eligible).toBe(false);
    expect(forged.missing.some((m) => m.kind === "required_assessments")).toBe(true);
  });

  it("requires instructor approval for Teacher Studio policy", () => {
    const policy = getCertificatePolicy("teacher-lesson-studio-basics")!;
    expect(policy.requireInstructorApproval).toBe(true);
    const without = evaluateCertificateEligibility({
      courseSlug: "teacher-lesson-studio-basics",
      certificateEligible: true,
      enrolmentStatus: "active",
      completedLessonIds: ["l1-teacher", "l1-quiz"],
      completedModuleIds: ["m1-lesson"],
      passedAssessmentScores: { "teacher-studio-review": 90 },
      instructorApproved: false,
      projectApproved: false,
    });
    expect(without.eligible).toBe(false);
    expect(without.missing.some((m) => m.kind === "instructor_approval")).toBe(true);
  });

  it("keeps policy assessment ids aligned with assessment catalogue", () => {
    expect(policyAssessmentIdsExist("bece-maths-foundations")).toBe(true);
    expect(policyAssessmentIdsExist("wassce-english-writing")).toBe(true);
  });
});

describe("Academy Phase 4 PDF, QR, privacy helpers", () => {
  it("builds verification URL and privacy-safe display names", () => {
    const url = buildVerificationUrl("gla_abc123");
    expect(url).toBe("https://www.giga3ai.com/gigalearn/academy/verify/?c=gla_abc123");
    expect(publicDisplayName("Kwame Mensah")).toBe("Kwame M.");
    expect(publicDisplayName(undefined)).toBe("Learner");
    expect(publicDisplayName("Ama")).toBe("Ama");
  });

  it("generates a PDF with QR pointing at the verification URL", async () => {
    const publicId = "gla_testphase4pdf0001";
    const verifyUrl = buildVerificationUrl(publicId);
    const qr = await buildCertificateQrDataUrl(verifyUrl);
    expect(qr.startsWith("data:image/png;base64,")).toBe(true);

    const pdf = await generateAcademyCertificatePdf({
      publicId,
      learnerDisplayName: "Kwame M.",
      courseTitle: "BECE Mathematics Foundations",
      issuedAt: Date.UTC(2026, 0, 15),
      completedAt: Date.UTC(2026, 0, 14),
      finalGrade: 82,
      status: "valid",
      verificationUrl: verifyUrl,
    });
    expect(pdf.byteLength).toBeGreaterThan(1000);
    // PDF magic header
    expect(String.fromCharCode(pdf[0], pdf[1], pdf[2], pdf[3])).toBe("%PDF");

    const revoked = await generateAcademyCertificatePdf({
      publicId,
      learnerDisplayName: "Kwame M.",
      courseTitle: "BECE Mathematics Foundations",
      issuedAt: Date.UTC(2026, 0, 15),
      completedAt: Date.UTC(2026, 0, 14),
      status: "revoked",
      verificationUrl: verifyUrl,
    });
    expect(revoked.byteLength).toBeGreaterThan(1000);
  }, 20000);

  it("documents concurrent/idempotent issuance controls in backend", () => {
    const src = read("convex/gigaLearnAcademyCertificates.ts");
    expect(src).toContain("issuanceKey");
    expect(src).toContain("reconcileDuplicates");
    expect(src).toContain("duplicate: true");
    expect(src).toContain("export const issueCertificate");
    expect(src).toContain("export const revokeCertificate");
    expect(src).toContain("verifyCertificatePublic");
    // Must not accept client grades on issue args
    const issueBlock = src.slice(
      src.indexOf("export const issueCertificate"),
      src.indexOf("export const listMyCertificates")
    );
    expect(issueBlock).not.toMatch(/args:\s*\{[\s\S]*?\bfinalGrade:\s*v\./);
    expect(issueBlock).not.toMatch(/args:\s*\{[\s\S]*?\bpassed:\s*v\./);
    expect(src).toContain("Not authorized to revoke");
    expect(src).not.toMatch(/\bctx\.db\.(insert|patch|replace)\([^)]*gigaLearnProgress/);
    expect(src).not.toMatch(/api\.gigaLearnProgress\./);
  });

  it("public verify payload omits email and answer keys", () => {
    const src = read("convex/gigaLearnAcademyCertificates.ts");
    const verifyBlock = src.slice(
      src.indexOf("export const verifyCertificatePublic"),
      src.indexOf("export const recordVerifyHit")
    );
    const returnBlock = verifyBlock.slice(verifyBlock.lastIndexOf("return {"));
    expect(returnBlock).toContain("learnerDisplayName");
    expect(returnBlock).toContain("courseTitle");
    expect(returnBlock).not.toMatch(/\buserId\s*:/);
    expect(returnBlock).not.toMatch(/\bemail\s*:/);
    expect(returnBlock).not.toContain("answersJson");
  });
});

describe("Academy Phase 4 UI + preservation", () => {
  it("wires certificate and verify routes for static export", () => {
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/certificates/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(resolve(ROOT, "web/app/(marketing)/gigalearn/academy/verify/page.tsx"))
    ).toBe(true);
    const schema = read("convex/schema.ts");
    expect(schema).toContain("gigaLearnAcademyCertificates: defineTable");
    expect(schema).toContain("completedLessonIdsJson");
    expect(schema).toContain("gigaLearnProgress: defineTable");
  });

  it("preserves hubs, assessments grading, and offline sync entry points", () => {
    expect(GIGALEARN_PRIMARY_AREAS).toHaveLength(6);
    const m1 = getBuiltinAssessment("bece-maths-foundations", "bece-maths-m1-quiz")!;
    const graded = gradeObjectiveSubmission(m1, { q1: "1", q2: "true", q3: "18" });
    expect(graded.passed).toBe(true);
    expect(existsSync(resolve(ROOT, "web/lib/gigalearn/offlineProgressQueue.ts"))).toBe(true);
  });
});
