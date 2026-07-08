import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaLearnPageRoot = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnPageRoot").then((m) => ({
      default: m.GigaLearnPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "GigaLearn",
  description:
    "Giga3 AI GigaLearn — AI tutor for students, teachers, and parents. BECE, WASSCE, WAEC quizzes, study plans, lesson notes, and homework help.",
};

export default function GigaLearnPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <Suspense fallback={<p className="text-center text-muted">Loading GigaLearn…</p>}>
          <GigaLearnPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
