import { Contact } from "@/components/sections/Contact";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { Pricing } from "@/components/sections/Pricing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Contact />
    </>
  );
}
