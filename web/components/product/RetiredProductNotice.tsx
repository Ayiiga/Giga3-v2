import { EDUCATION_FIRST_DESTINATIONS } from "@/lib/navigation/retiredProducts";
import Link from "next/link";

type RetiredProductNoticeProps = {
  formerName: string;
  summary: string;
  /** Optional deep-link for preserved local/shared tooling (not a product promo). */
  extraHref?: string;
  extraLabel?: string;
};

export function RetiredProductNotice({
  formerName,
  summary,
  extraHref,
  extraLabel,
}: RetiredProductNoticeProps) {
  return (
    <section
      className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14"
      data-testid="retired-product-notice"
      aria-labelledby="retired-product-heading"
    >
      <p className="text-sm font-medium text-violet-700">Product update</p>
      <h1
        id="retired-product-heading"
        className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
      >
        {formerName} is no longer a dedicated product
      </h1>
      <p className="mt-3 text-base leading-relaxed text-slate-600">{summary}</p>
      <p className="mt-4 text-sm text-slate-500">
        Giga3 AI is focused on learning and productivity: Academy, Exam Practice, AI
        Assistant, Technology Learning Hub, GigaSocial, and Marketplace.
      </p>
      {extraHref && extraLabel ? (
        <p className="mt-4">
          <Link
            href={extraHref}
            className="text-sm font-medium text-violet-700 underline-offset-2 hover:underline"
          >
            {extraLabel}
          </Link>
        </p>
      ) : null}
      <ul className="mt-8 space-y-3">
        {EDUCATION_FIRST_DESTINATIONS.map((dest) => (
          <li key={dest.href}>
            <Link
              href={dest.href}
              className="block rounded-xl border border-violet-100 bg-white px-4 py-3 shadow-sm transition hover:border-violet-300 hover:bg-violet-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              <span className="font-semibold text-slate-900">{dest.label}</span>
              <span className="mt-0.5 block text-sm text-slate-600">
                {dest.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/chat/" className="font-medium text-violet-700 underline-offset-2 hover:underline">
          Return to AI Assistant
        </Link>
      </p>
    </section>
  );
}
