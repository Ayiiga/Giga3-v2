"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site";
import {
  BarChart3,
  Building2,
  GraduationCap,
  Lock,
  Shield,
  Users,
} from "lucide-react";

function EnterpriseLandingInner() {
  return (
    <div className="mx-auto max-w-5xl space-y-12">
      <header className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium text-violet-700">
          <Building2 className="h-4 w-4" aria-hidden />
          Enterprise & Education
        </div>
        <h1 className="page-title">Schools, organizations & teams</h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">
          Giga3 AI workspaces for schools, universities, NGOs, and businesses —
          isolated from the consumer experience with role-based access control.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/workspace" variant="primary" size="lg">
            Open workspace
          </ButtonLink>
          <ButtonLink href={siteConfig.links.gigalearn} variant="secondary" size="lg">
            GigaLearn (individual)
          </ButtonLink>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="glass rounded-2xl border border-border p-6">
          <GraduationCap className="h-8 w-8 text-violet-600" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">School management</h2>
          <p className="mt-2 text-sm text-muted">
            School profiles, teacher and student accounts, parent visibility,
            classroom management, assignments, and learning analytics.
          </p>
        </article>
        <article className="glass rounded-2xl border border-border p-6">
          <Users className="h-8 w-8 text-sky-600" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Organization workspace</h2>
          <p className="mt-2 text-sm text-muted">
            Team management, AI resource allocation, usage monitoring, and
            permission controls for businesses and institutions.
          </p>
        </article>
        <article className="glass rounded-2xl border border-border p-6">
          <Shield className="h-8 w-8 text-emerald-600" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Role-based access</h2>
          <p className="mt-2 text-sm text-muted">
            Administrators, teachers, parents, students, and creators — enforced
            on both client and server with audit logging.
          </p>
        </article>
        <article className="glass rounded-2xl border border-border p-6">
          <BarChart3 className="h-8 w-8 text-amber-600" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold">Aggregated analytics</h2>
          <p className="mt-2 text-sm text-muted">
            AI usage, learning engagement, and assignment completion — aggregated
            insights only, with data isolation between organizations.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Consumer experience unchanged</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Individual users keep chat, GigaLearn, Creator Studio, Marketplace,
          and Wallet exactly as today. Enterprise workspaces are optional and
          isolated.
        </p>
        <ButtonLink href="/#contact" variant="ghost" className="mt-4">
          Contact for Enterprise billing
        </ButtonLink>
      </section>
    </div>
  );
}

export function EnterpriseLandingClient() {
  return (
    <ConvexAppShell>
      <EnterpriseLandingInner />
    </ConvexAppShell>
  );
}
