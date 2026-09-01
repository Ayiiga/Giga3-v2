import { Container } from "@/components/ui/Container";
import { CREATOR_WORKFLOW_STEPS } from "@/lib/seo/productLinks";

/** Static explanation of the create → edit → publish flow across Media Studio and GigaEdit. */
export function CreatorWorkflowIntro() {
  return (
    <section className="border-b border-border bg-zinc-50 py-10">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-lg font-semibold text-foreground">Creator workflow on Giga3 AI</h2>
          <p className="mt-3 text-base leading-7 text-muted">
            Start in Media Studio to generate images, open GigaEdit to assemble and refine video,
            then publish to GigaSocial when your work is ready.
          </p>
          <ol className="mt-6 space-y-4">
            {CREATOR_WORKFLOW_STEPS.map((item, index) => (
              <li key={item.step} className="flex gap-4">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <a href={item.href} className="font-medium text-foreground hover:text-accent">
                    {item.step}
                  </a>
                  <p className="mt-1 text-sm leading-6 text-muted">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
