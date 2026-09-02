import Link from "next/link";
import type { FaqItem } from "@/components/seo/JsonLd";

/** Shared prose primitives for long-form public SEO articles. */

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed text-muted">{children}</p>;
}

export function ArticleH2({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="text-xl font-semibold text-foreground">
      {children}
    </h2>
  );
}

export function ArticleH3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground">{children}</h3>;
}

export function ArticleLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-accent hover:underline">
      {children}
    </Link>
  );
}

export function BulletList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-6 text-base leading-relaxed text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export type ArticleTableProps = {
  caption: string;
  headers: readonly string[];
  rows: readonly (readonly string[])[];
};

export function ArticleTable({ caption, headers, rows }: ArticleTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-slate-50 text-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-t border-border">
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={cell} scope="row" className="px-4 py-3 font-medium text-foreground">
                    {cell}
                  </th>
                ) : (
                  <td key={`${cell}-${index}`} className="px-4 py-3 text-muted">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Visible FAQ — pass the same array to `<JsonLd faq={…} />` so rich results match. */
export function FaqSection({ items }: { items: readonly FaqItem[] }) {
  return (
    <section className="mt-12" aria-labelledby="faq-heading">
      <ArticleH2 id="faq-heading">Frequently Asked Questions</ArticleH2>
      <dl className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.question} className="saas-card rounded-2xl border border-border p-5">
            <dt className="font-semibold text-foreground">{item.question}</dt>
            <dd className="mt-2 text-base leading-relaxed text-muted">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function RelatedReading({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-label="Related reading" className="mt-12 rounded-2xl border border-border p-5">
      <p className="text-sm font-semibold text-foreground">Related reading</p>
      <ul className="mt-2 space-y-1 text-base">
        {links.map((link) => (
          <li key={link.href}>
            <ArticleLink href={link.href}>{link.label}</ArticleLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
