"use client";

import { BetaGrowthPanel } from "@/components/phase5/BetaGrowthPanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { usePhase5Flags } from "@/hooks/usePhase5Flags";

/** Public beta waitlist / invite redeem — UI gated by phase5.beta. */
export default function BetaPage() {
  return (
    <ConvexAppShell>
      <Container className="section-padding">
        <BetaPageInner />
      </Container>
    </ConvexAppShell>
  );
}

function BetaPageInner() {
  const flags = usePhase5Flags();
  if (!flags.beta) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-2xl font-semibold">Public beta</h1>
        <p className="mt-3 text-sm text-muted">
          Controlled beta signup is not open on this deployment yet. Existing Chat,
          GigaSocial, and learning features remain available.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/chat/" variant="primary">
            Open chat
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Home
          </ButtonLink>
        </div>
      </div>
    );
  }
  return <BetaGrowthPanel />;
}
