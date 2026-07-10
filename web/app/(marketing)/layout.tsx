import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MarketingScrollFix } from "@/components/marketing/MarketingScrollFix";
import { MarketingBodyScrollUnlock } from "@/components/marketing/MarketingBodyScrollUnlock";
import { SkipToContent } from "@/components/a11y/SkipToContent";
import { JsonLd } from "@/components/seo/JsonLd";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-marketing="true" className="marketing-stable min-h-full bg-white">
      <JsonLd type="WebSite" />
      <JsonLd type="Organization" />
      <SkipToContent />
      <MarketingBodyScrollUnlock />
      <MarketingScrollFix />
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="marketing-scroll-main pb-[max(1.5rem,env(safe-area-inset-bottom))] focus:outline-none"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
