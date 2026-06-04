import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ArrowRight, Layers, RefreshCw, Shield } from "lucide-react";

const steps = [
  {
    title: "Primary model",
    description: "Your message goes to OpenAI first, then backup models and keys.",
    icon: Layers,
  },
  {
    title: "Automatic failover",
    description:
      "If OpenAI fails, Giga3 tries Gemini, then fal.ai (OpenRouter), with clear provider labels in chat.",
    icon: RefreshCw,
  },
  {
    title: "Always a reply",
    description:
      "Conversations stay in sync on Convex. Users see which provider answered and whether a backup was used.",
    icon: Shield,
  },
] as const;

export function MultiChat() {
  return (
    <section
      id="multi-chat"
      className="section-padding scroll-mt-24 border-y border-border bg-zinc-50"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-heading text-sm font-medium uppercase tracking-wider text-accent">
            Multi-provider AI
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Chat that keeps going when one AI fails
          </h2>
          <p className="section-lead">
            Giga3 runs a multi-step chat engine on the server—so a single outage does
            not blank your product. Multiple conversations, modes, and history are
            built in.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="glass relative rounded-2xl p-8 transition hover:border-violet-500/30"
              >
                <span className="absolute right-4 top-4 text-xs font-mono text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon aria-hidden />
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-14 flex justify-center">
          <ButtonLink href="/chat/login" size="lg" className="min-w-[240px]">
            Try multi-chat now
            <ArrowRight aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
