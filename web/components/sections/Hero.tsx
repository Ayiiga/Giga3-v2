import { InstallButton } from "@/components/pwa/InstallButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { heroStats, siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArrowRight, Bot } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
      <div
        className="pointer-events-none absolute -left-1/4 top-1/4 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/4 bottom-0 h-[320px] w-[320px] rounded-full bg-fuchsia-600/15 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[length:48px_48px] opacity-40"
        aria-hidden
      />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-5 py-2 text-base text-violet-200 shadow-lg shadow-violet-500/10">
            <BrandLogo size={24} />
            Multi-provider AI · Production-ready PWA
          </div>

          <h1 className="animate-fade-in text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl [animation-delay:80ms]">
            <span className="text-gradient">{siteConfig.name}</span>
            <br />
            <span className="text-foreground">{siteConfig.tagline}</span>
          </h1>

          <p className="section-lead animate-fade-in mx-auto max-w-2xl text-lg leading-relaxed [animation-delay:160ms]">
            {siteConfig.description} Run multiple chats with automatic AI failover,
            credit-based billing, and a polished mobile experience.
          </p>

          <div className="animate-fade-in mx-auto mt-12 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3 [animation-delay:240ms]">
            <ButtonLink href="/chat/login" size="lg" className="w-full">
              Start chatting
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="#multi-chat" variant="secondary" size="lg" className="w-full">
              See multi-AI
            </ButtonLink>
            <InstallButton size="lg" variant="outline" className="w-full sm:col-span-2 lg:col-span-1" />
          </div>

          <dl className="animate-fade-in mx-auto mt-16 grid max-w-lg grid-cols-3 gap-5 [animation-delay:280ms]">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl px-3 py-4 text-center"
              >
                <dt className="text-xs text-muted">{stat.label}</dt>
                <dd className="mt-1 text-xl font-bold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-fade-in relative mx-auto mt-20 max-w-4xl [animation-delay:320ms]">
          <div className="glass animate-float overflow-hidden rounded-2xl p-1 shadow-2xl shadow-violet-500/15 ring-1 ring-violet-500/20">
            <div className="rounded-xl bg-gradient-to-b from-white/[0.07] to-transparent p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
                <Bot className="text-accent" aria-hidden />
                <span className="font-medium">Giga3 Assistant</span>
                <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                  Failover active
                </span>
              </div>
              <div className="space-y-4 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3 text-muted">
                  What happens if the primary AI provider is down?
                </div>
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-accent/20 px-4 py-3 text-foreground">
                  Giga3 tries backup models and keys automatically—your team keeps
                  chatting while we surface which provider answered.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
