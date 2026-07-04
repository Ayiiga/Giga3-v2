import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { LEGAL_EFFECTIVE_DATE, legalDocuments } from "@/lib/legal/content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal",
  description: "Giga3 AI legal policies — Terms of Service, Cookie Policy, Refund Policy, and Acceptable Use.",
};

export default function LegalIndexPage() {
  return (
    <div className="section-padding pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h1 className="hero-title">Legal</h1>
          <p className="mt-4 text-base leading-[1.7] text-muted">
            Policies for using Giga3 AI. Effective {LEGAL_EFFECTIVE_DATE}.
          </p>

          <ul className="mt-10 space-y-4">
            {legalDocuments.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={`/legal/${doc.slug}/`}
                  className="block rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md"
                >
                  <h2 className="text-lg font-semibold text-foreground">{doc.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{doc.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </div>
  );
}
