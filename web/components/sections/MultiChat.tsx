import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ArrowRight, Layers, RefreshCw, Shield } from "lucide-react";

const steps = [
  {
    title: "Primary model",
    description: "Your message goes to the configured OpenAI model first.",
    icon: Layers,
  },
  {
    title: "Automatic failover",
    description:
      "If that provider errors or times out, Giga3 tries backup models, a compact retry, and an optional secondary API key.",
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
      className="section-padding scroll-mt-24 border-y border-border/60 bg-gradient-to-b from-violet-500/[0.06] to-transparent"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-accent">
            Multi-provider AI
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Chat that keeps going when one AI fails
          </h2>
          <p className="mt-4 text-muted">
            Giga3 runs a multi-step chat engine on the server—so a single outage does
            not blank your product. Multiple conversations, modes, and history are
            built in.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="glass relative rounded-2xl p-6 transition hover:border-violet-500/30"
              >
                <span className="absolute right-4 top-4 text-xs font-mono text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <ButtonLink href="/chat/login" size="lg">
            Try multi-chat now
            <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
