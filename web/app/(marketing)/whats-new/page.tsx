"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";

const STORIES = [
  {
    title: "Creators shipping faster with Giga3",
    body: "From caption drafts to image edits — creators across the continent are publishing more often with AI Studio and GigaSocial.",
  },
  {
    title: "Students using GigaLearn for practice",
    body: "Study groups and AI practice quizzes help learners stay consistent without replacing teachers.",
  },
];

/** Marketing readiness — release notes / stories. Gated by phase5.marketing. */
export default function WhatsNewPage() {
  return (
    <ConvexAppShell>
      <Container className="section-padding">
        <WhatsNewInner />
      </Container>
    </ConvexAppShell>
  );
}

function WhatsNewInner() {
  const flags = usePhase5Flags();
  if (!flags.marketing) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-2xl font-semibold">What’s new</h1>
        <p className="mt-3 text-sm text-muted">
          Release notes will appear here when marketing readiness is enabled.
        </p>
        <ButtonLink className="mt-6" href="/" variant="ghost">
          Home
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">What’s new in Giga3</h1>
        <p className="mt-2 text-sm text-muted">
          Public beta highlights for creators, students, and communities. Static
          marketing content — zero impact on Chat performance.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Release notes
        </h2>
        <ul className="space-y-3 text-sm">
          <li className="rounded-2xl border bg-card p-4">
            Phase 5 foundation: controlled beta flags, invites, feedback workflow.
          </li>
          <li className="rounded-2xl border bg-card p-4">
            Creator insights, daily challenges, and education expansion available
            when enabled for your cohort.
          </li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Creator success stories
        </h2>
        {STORIES.map((story) => (
          <article key={story.title} className="rounded-2xl border bg-card p-4">
            <h3 className="font-medium">{story.title}</h3>
            <p className="mt-2 text-sm text-muted">{story.body}</p>
          </article>
        ))}
      </section>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/beta/" variant="primary">
          Join public beta
        </ButtonLink>
        <ButtonLink href="/gigasocial/" variant="secondary">
          Open GigaSocial
        </ButtonLink>
      </div>
    </div>
  );
}
