import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ArrowRight, Briefcase, GraduationCap, WandSparkles } from "lucide-react";

const STARTING_POINTS = [
  {
    name: "Study",
    description: "Prepare for BECE, WASSCE, or Teacher Promotion with practice questions and answer explanations.",
    href: "/gigalearn/exam/",
    action: "Try exam practice",
    icon: GraduationCap,
  },
  {
    name: "Create",
    description: "Generate images and short videos for lessons, social posts, and projects.",
    href: "/media/",
    action: "Open Media Studio",
    icon: WandSparkles,
  },
  {
    name: "Work",
    description: "Draft a lesson plan, outline a proposal, or work through a question with AI Chat.",
    href: "/chat/",
    action: "Open AI Chat",
    icon: Briefcase,
  },
] as const;

export function Hero() {
  return (
    <section className="discover-stable bg-white py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-heading">Built in Ghana</p>
          <h1 className="hero-title mt-3">Practise for exams, create content, and get work done with Giga3 AI</h1>
          <p className="section-lead mx-auto mt-4 max-w-2xl">
            Start with guided BECE and WASSCE practice, make images and videos, or get help with everyday work.
            Paid plans are priced in Ghana cedis.
          </p>
        </div>
        <div className="discover-card-grid discover-card-grid--3 mx-auto mt-8 max-w-5xl">
          {STARTING_POINTS.map(({ name, description, href, action, icon: Icon }, index) => (
            <article key={name} className="saas-card flex flex-col gap-3 rounded-2xl p-5 sm:p-6">
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <h2 className="text-xl font-semibold text-foreground">{name}</h2>
              <p className="flex-1 text-sm leading-6 text-muted">{description}</p>
              <ButtonLink href={href} variant={index === 0 ? "primary" : "secondary"} className="w-full">
                {action}
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </ButtonLink>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
