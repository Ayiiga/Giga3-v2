import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { LegalDocument as LegalDocumentType } from "@/lib/legal/content";
import { legalNavLinks } from "@/lib/legal/content";

function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-[1.7] text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalDocument({ document }: { document: LegalDocumentType }) {
  return (
    <div className="section-padding pt-28 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Container>
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-muted">
            <Link href="/legal/" className="hover:text-foreground">
              Legal
            </Link>
            <span aria-hidden="true"> · </span>
            {document.title}
          </p>

          <h1 className="hero-title mt-3">{document.title}</h1>
          <p className="mt-3 text-sm text-muted">Effective Date: {document.effectiveDate}</p>

          {document.intro?.map((paragraph) => (
            <p key={paragraph} className="mt-6 text-base leading-[1.7] text-muted">
              {paragraph}
            </p>
          ))}

          <div className="mt-8 space-y-8">
            {document.sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 text-base leading-[1.7] text-muted">
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? <BulletList items={section.bullets} /> : null}
              </section>
            ))}
          </div>

          {document.outro?.map((paragraph) => (
            <p key={paragraph} className="mt-8 text-base leading-[1.7] text-muted">
              {paragraph}
            </p>
          ))}

          <nav
            aria-label="Other legal documents"
            className="mt-12 rounded-2xl border border-border bg-zinc-50 p-6"
          >
            <h2 className="text-sm font-semibold text-foreground">Related policies</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {legalNavLinks
                .filter((link) => !link.href.includes(`/legal/${document.slug}/`))
                .map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>
      </Container>
    </div>
  );
}
