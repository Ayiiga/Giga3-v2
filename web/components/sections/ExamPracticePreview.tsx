import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

// Original GigaLearn practice question exam-wassce-core-mathematics-q001.
export function ExamPracticePreview() {
  return (
    <section className="discover-stable bg-accent/5 py-10 sm:py-14" aria-labelledby="practice-preview">
      <Container className="grid max-w-5xl gap-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="section-heading">GigaLearn</p>
          <h2 id="practice-preview" className="page-title mt-2">Try a practice question before signing up</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Try original practice for BECE, WASSCE, or Teacher Promotion. WASSCE covers Core Mathematics,
            English Language, Integrated Science, and Social Studies.
          </p>
          <ButtonLink href="/gigalearn/exam/wassce/" variant="secondary" className="mt-5">
            Explore WASSCE practice
          </ButtonLink>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold text-accent">WASSCE Core Mathematics sample</p>
          <p className="mt-2 text-base text-foreground">
            A school-community delivery project makes 41 trips and carries 7 parcels on each trip.
            How many parcels are delivered?
          </p>
          <ol className="mt-3 grid list-inside list-[upper-alpha] grid-cols-2 gap-2 text-sm">
            {["276", "298", "304", "287"].map((option) => (
              <li key={option} className="rounded-lg border border-border px-3 py-2">{option}</li>
            ))}
          </ol>
          <details className="mt-3 rounded-xl bg-accent/5 px-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-accent">Reveal answer</summary>
            <p className="pb-3 text-sm leading-6 text-foreground">
              <strong>D. 287 parcels.</strong> Multiply 41 trips by 7 parcels per trip.
            </p>
          </details>
          <p className="mt-3 text-xs text-muted">Original GigaLearn practice sample.</p>
        </div>
      </Container>
    </section>
  );
}
