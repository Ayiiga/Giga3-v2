import Link from "next/link";

/** First focus target for keyboard and screen-reader users. */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="absolute left-4 top-0 z-[100] -translate-y-full rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
