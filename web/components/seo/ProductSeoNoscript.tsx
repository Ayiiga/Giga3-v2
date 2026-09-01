import { GIGA3_PRODUCT_LINKS } from "@/lib/seo/productLinks";

type ProductSeoNoscriptProps = {
  title: string;
  description: string;
  detail?: string;
};

/**
 * Crawlable copy for authenticated app shells where visible static content would
 * interfere with the full-screen interactive UI. Shown only when JavaScript is off.
 */
export function ProductSeoNoscript({ title, description, detail }: ProductSeoNoscriptProps) {
  return (
    <noscript>
      <section className="border-b border-border bg-white px-4 py-8">
        <h1>{title}</h1>
        <p>{description}</p>
        {detail ? <p>{detail}</p> : null}
        <nav aria-label="Explore Giga3 AI products">
          <ul>
            {GIGA3_PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </noscript>
  );
}
