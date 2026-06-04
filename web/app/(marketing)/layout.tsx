import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-marketing="true" className="marketing-stable min-h-dvh bg-white">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
