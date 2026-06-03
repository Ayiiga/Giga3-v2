import { InstallButton } from "@/components/pwa/InstallButton";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";
import { ArrowRight, Bot, Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[length:48px_48px] opacity-40"
        aria-hidden
      />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-200">
            <Sparkles className="h-4 w-4" aria-hidden />
            Next-gen AI chat platform
          </div>

          <h1 className="animate-fade-in text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl [animation-delay:80ms]">
            <span className="text-gradient">{siteConfig.name}</span>
            <br />
            <span className="text-foreground">{siteConfig.tagline}</span>
          </h1>

          <p className="animate-fade-in mx-auto mt-6 max-w-2xl text-lg text-muted [animation-delay:160ms]">
            {siteConfig.description} Ship faster with a production-ready stack:
            Convex backend, secure OpenAI integration, and an installable PWA.
          </p>

          <div className="animate-fade-in mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row [animation-delay:240ms]">
            <ButtonLink href="/chat/login" size="lg">
              Start chatting
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#pricing" variant="secondary" size="lg">
              View pricing
            </ButtonLink>
            <InstallButton size="lg" variant="outline" />
          </div>
        </div>

        <div className="animate-fade-in relative mx-auto mt-16 max-w-4xl [animation-delay:320ms]">
          <div className="glass animate-float overflow-hidden rounded-2xl p-1 shadow-2xl shadow-violet-500/10">
            <div className="rounded-xl bg-gradient-to-b from-white/5 to-transparent p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
                <Bot className="h-5 w-5 text-accent" aria-hidden />
                <span className="text-sm font-medium">Giga3 Assistant</span>
                <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                  Online
                </span>
              </div>
              <div className="space-y-4 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 px-4 py-3 text-muted">
                  How can Giga3 help my team ship AI features faster?
                </div>
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-sm bg-accent/20 px-4 py-3 text-foreground">
                  Giga3 gives you credit-based chat, secure server-side AI calls, and a
                  mobile-first PWA—deployed globally on Cloudflare Pages.
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
