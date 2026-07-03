import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MarketingScrollFix } from "@/components/marketing/MarketingScrollFix";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-marketing="true" className="marketing-stable min-h-full bg-white">
      <MarketingScrollFix />
      <Header />
      <main className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</main>
      <Footer />
    </div>
  );
}
