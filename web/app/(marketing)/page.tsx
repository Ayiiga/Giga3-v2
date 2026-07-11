import { Contact } from "@/components/sections/Contact";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { MultiChat } from "@/components/sections/MultiChat";
import { Pricing } from "@/components/sections/Pricing";
import { TrendIntelligenceSection } from "@/components/sections/TrendIntelligenceSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrendIntelligenceSection />
      <Features />
      <MultiChat />
      <Pricing />
      <Contact />
    </>
  );
}
