import { InstallButton } from "@/components/pwa/InstallButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { heroStats, siteConfig } from "@/lib/site";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ArrowRight, Bot } from "lucide-react";

export function Hero() {
  return (
    <section className="bg-white pt-12 sm:pt-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-subtle px-4 py-2 text-sm font-medium text-accent">
            <BrandLogo size={20} className="shadow-none ring-0" />
            Multi-provider AI · Production-ready PWA
          </div>

          <h1 className="heading-hero">
            <span className="text-gradient">{siteConfig.name}</span>
            <br />
            <span>{siteConfig.tagline}</span>
          </h1>

          <p className="section-lead mx-auto mt-6 max-w-2xl">
            {siteConfig.description} Run multiple chats with automatic AI failover,
            credit-based billing, and a polished mobile experience.
          </p>

          <div className="mx-auto mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3">
            <ButtonLink href="/chat/login" size="lg" className="w-full">
              Start chatting
              <ArrowRight aria-hidden />
            </ButtonLink>
            <ButtonLink href="#multi-chat" variant="secondary" size="lg" className="w-full">
              See multi-AI
            </ButtonLink>
            <div className="pwa-install-slot w-full sm:col-span-2 lg:col-span-1">
              <InstallButton size="lg" variant="outline" className="w-full" />
            </div>
          </div>

          <dl className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl px-3 py-4 text-center"
              >
                <dt className="text-xs text-muted">{stat.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl">
          <div className="glass overflow-hidden rounded-2xl p-1 shadow-premium">
            <div className="rounded-xl bg-zinc-50 p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
                <Bot className="text-accent" aria-hidden />
                <span className="font-medium">Giga3 Assistant</span>
                <span className="ml-auto rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-medium text-accent">
                  Failover active
                </span>
              </div>
              <div className="space-y-4 text-base leading-[1.7]">
                <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-muted shadow-subtle">
                  What happens if the primary AI provider is down?
                </div>
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-md bg-accent-subtle px-4 py-3 text-foreground">
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
