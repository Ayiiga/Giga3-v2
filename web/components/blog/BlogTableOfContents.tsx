import Link from "next/link";

export type TocItem = { id: string; label: string };

export function BlogTableOfContents({ items }: { items: readonly TocItem[] }) {
  if (items.length < 3) return null;

  return (
    <nav aria-label="Table of contents" className="rounded-2xl border border-border bg-slate-50/80 p-5">
      <h2 className="text-sm font-semibold text-foreground">On this page</h2>
      <ol className="mt-3 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BlogProductCta({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <aside
      aria-label="Giga3 product recommendation"
      className="mt-12 rounded-2xl border border-violet-200 bg-violet-50/60 p-6"
    >
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-muted">{description}</p>
      <p className="mt-4">
        <Link
          href={href}
          className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {label}
        </Link>
      </p>
    </aside>
  );
}
