import { Container } from "@/components/ui/Container";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import dynamic from "next/dynamic";
import { Suspense } from "react";

const GigaLearnPageRoot = dynamic(
  () =>
    import("@/components/gigalearn/GigaLearnPageRoot").then((m) => ({
      default: m.GigaLearnPageRoot,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata = publicMetadata({
  path: "/gigalearn",
  title: "GigaLearn — AI Learning Support",
  description:
    "GigaLearn by Giga3 AI supports students, teachers, and parents with practical AI-assisted learning tools and study support.",
});

export default function GigaLearnPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <header className="mx-auto mb-8 max-w-3xl">
          <h1 className="page-title">GigaLearn — Learn with practical AI support</h1>
          <p className="section-lead mt-4">
            GigaLearn brings focused learning support to students, teachers, and families through Giga3 AI.
          </p>
        </header>
        <Suspense fallback={<p className="text-center text-muted">Loading GigaLearn…</p>}>
          <GigaLearnPageRoot />
        </Suspense>
      </Container>
    </div>
  );
}
