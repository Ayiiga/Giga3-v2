import { Contact } from "@/components/sections/Contact";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { JsonLd } from "@/components/seo/JsonLd";
import { MultiChat } from "@/components/sections/MultiChat";
import { Pricing } from "@/components/sections/Pricing";
import { TrendIntelligenceSection } from "@/components/sections/TrendIntelligenceSection";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/",
  title: "Giga3 AI — Africa's AI Super App",
  description:
    "Giga3 AI is an African AI-powered super app combining social media, AI tools, creator editing, learning, marketplace and digital services in one platform.",
});

export default function HomePage() {
  return (
    <>
      <JsonLd type="WebApplication" />
      <Hero />
      <TrendIntelligenceSection />
      <Features />
      <MultiChat />
      <Pricing />
      <Contact />
    </>
  );
}
