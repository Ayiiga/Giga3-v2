import Link from "next/link";

/** Screen-reader only until keyboard focus — never visible on screen otherwise. */
export function SkipToContent() {
  return (
    <Link
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </Link>
  );
}
