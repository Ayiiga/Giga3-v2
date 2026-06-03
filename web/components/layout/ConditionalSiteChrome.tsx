"use client";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";

/** Routes that use full-screen app UI without marketing header/footer. */
function isAppShellRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/chat") ||
    pathname.startsWith("/payment/")
  );
}

function ConditionalSiteChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isAppShellRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export function ConditionalSiteChrome({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main>{children}</main>}>
      <ConditionalSiteChromeInner>{children}</ConditionalSiteChromeInner>
    </Suspense>
  );
}
