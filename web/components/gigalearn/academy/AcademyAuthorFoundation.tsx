"use client";

import { AcademyChrome } from "@/components/gigalearn/academy/AcademyChrome";
import { Button } from "@/components/ui/Button";
import { ClientAppHydrationNotice } from "@/components/seo/ClientAppHydrationNotice";
import { ProductSignInPrompt } from "@/components/seo/ProductSignInPrompt";
import { getSessionToken } from "@/lib/auth";
import { hasPersistedAuth } from "@/lib/auth/sessionRestore";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

const DEFAULT_MODULES_JSON = JSON.stringify(
  [
    {
      id: "m1",
      title: "Module 1",
      summary: "First module",
      lessons: [
        {
          id: "l1",
          title: "Open Student Learn",
          summary: "Reference existing GigaLearn Learn tab",
          required: true,
          estimatedMinutes: 15,
          activityKind: "lesson",
          resource: { kind: "gigalearn_tab", tab: "learn", label: "Student Learn" },
        },
      ],
    },
  ],
  null,
  2
);

export function AcademyAuthorFoundation() {
  const sessionToken = getSessionToken();
  const authz = useQuery(
    api.gigaLearnAcademy.canAuthorCourses,
    sessionToken ? { sessionToken } : "skip"
  );
  const mine = useQuery(
    api.gigaLearnAcademy.listMyAuthoredCourses,
    sessionToken ? { sessionToken } : "skip"
  );
  const upsert = useMutation(api.gigaLearnAcademy.upsertAuthoredCourse);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [category, setCategory] = useState("Study skills");
  const [modulesJson, setModulesJson] = useState(DEFAULT_MODULES_JSON);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!sessionToken && !hasPersistedAuth()) {
    return (
      <AcademyChrome active="author" title="Author foundation">
        <ProductSignInPrompt
          productName="GigaLearn Academy"
          description="Authorized authors can create structured courses here."
          nextPath="/gigalearn/academy/author/"
        />
      </AcademyChrome>
    );
  }

  async function onSave() {
    if (!sessionToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await upsert({
        sessionToken,
        slug,
        title,
        description,
        subject,
        category,
        difficulty: "beginner",
        durationMinutes: 60,
        learningObjectives: ["Complete the pathway modules"],
        prerequisites: ["Signed-in Giga3 account"],
        curriculumPreview: "References existing GigaLearn tools — does not copy curriculum bodies.",
        assessmentDescription: "Pathway checkpoints only in Phase 1.",
        instructorName: "Course author",
        access: "free",
        certificateEligible: false,
        completionRequirements: "Complete required lessons in the pathway.",
        modulesJson,
        status,
      });
      setMessage(
        result.created
          ? `Created course “${result.slug}” (${status}).`
          : `Updated course “${result.slug}” (${status}).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AcademyChrome
      active="author"
      title="Author foundation"
      subtitle="Phase 1 minimum authoring model. AI auto-publish and certificates come later. Built-in catalogue slugs cannot be overwritten."
    >
      {authz === undefined ? (
        <ClientAppHydrationNotice productName="GigaLearn Academy" />
      ) : !authz.allowed ? (
        <div className="saas-card rounded-2xl border border-border p-6 text-sm text-muted">
          <p>
            Authoring is limited to accepted admin/creator invites. Teachers can still use the
            existing Teacher Studio tools under GigaLearn hubs.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="saas-card space-y-3 rounded-2xl border border-border p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-foreground">Create or update course</h2>
            <label className="block text-sm">
              <span className="text-xs text-muted">Slug</span>
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-border px-3"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-course-slug"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted">Title</span>
              <input
                className="mt-1 min-h-11 w-full rounded-xl border border-border px-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted">Description</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-xl border border-border px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="text-xs text-muted">Subject</span>
                <input
                  className="mt-1 min-h-11 w-full rounded-xl border border-border px-3"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-muted">Category</span>
                <input
                  className="mt-1 min-h-11 w-full rounded-xl border border-border px-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs text-muted">Status</span>
                <select
                  className="mt-1 min-h-11 w-full rounded-xl border border-border px-3"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "draft" | "published" | "archived")
                  }
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="text-xs text-muted">Pathway modules JSON</span>
              <textarea
                className="mt-1 min-h-40 w-full rounded-xl border border-border px-3 py-2 font-mono text-xs"
                value={modulesJson}
                onChange={(e) => setModulesJson(e.target.value)}
              />
            </label>
            <Button type="button" className="min-h-11" disabled={busy} onClick={() => void onSave()}>
              {busy ? "Saving…" : "Save course"}
            </Button>
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {message ? <p className="text-sm text-foreground">{message}</p> : null}
          </section>

          <section className="saas-card rounded-2xl border border-border p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-foreground">Your authored courses</h2>
            {mine === undefined ? (
              <p className="mt-2 text-sm text-muted">Loading…</p>
            ) : mine.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No authored courses yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {mine.map((c) => (
                  <li key={c.slug} className="rounded-xl border border-border px-3 py-2">
                    <span className="font-medium text-foreground">{c.title}</span>
                    <span className="text-muted">
                      {" "}
                      · {c.slug} · {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AcademyChrome>
  );
}
