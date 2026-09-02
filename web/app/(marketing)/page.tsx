import { Contact } from "@/components/sections/Contact";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { JsonLd } from "@/components/seo/JsonLd";
import { MultiChat } from "@/components/sections/MultiChat";
import { Pricing } from "@/components/sections/Pricing";
import { TrendIntelligenceSection } from "@/components/sections/TrendIntelligenceSection";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";

export const metadata = publicMetadata({
  path: "/",
  title: "Giga3 AI — Africa's AI Super App | Multi-Provider AI Chat with Failover",
  description:
    "Giga3 AI is Africa's AI Super App. Chat, create, learn, and grow your business with multi-provider AI failover (OpenAI, Gemini), Paystack billing in GHS, and production-ready PWA. Built in Africa.",
});

/** Offers mirror the visible homepage pricing teaser (Free + Pro); Enterprise is quote-based. */
const HOME_OFFERS = [
  {
    name: "Free",
    price: 0,
    priceCurrency: "GHS",
    description: `${FREE_STARTER_CREDITS} starter credits`,
    path: "/chat/login",
  },
  {
    name: `${SUBSCRIPTION_PLANS.pro.label} (monthly)`,
    price: SUBSCRIPTION_PLANS.pro.priceGhs,
    priceCurrency: "GHS",
    description: `${SUBSCRIPTION_PLANS.pro.credits} credits per month`,
    path: "/pricing",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd type="WebApplication" />
      <JsonLd offers={HOME_OFFERS} />
      <Hero />
      <TrendIntelligenceSection />
      <Features />
      <MultiChat />
      <Pricing />
      <Contact />
    </>
  );
}
