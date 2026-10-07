import { Contact } from "@/components/sections/Contact";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { MultiChat } from "@/components/sections/MultiChat";
import { Pricing } from "@/components/sections/Pricing";
import { TrendIntelligenceSection } from "@/components/sections/TrendIntelligenceSection";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";

const HOME_DESCRIPTION =
  "Giga3 AI is Africa's AI super app for chat, research, learning, coding, image and video creation, editing and productivity. Built in Ghana for Africa and the world.";

export const metadata = publicMetadata({
  path: "/",
  title: "Giga3 AI — Africa's AI Super App for Ghana | Chat, Learn & Create",
  description: HOME_DESCRIPTION,
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
      <SiteStructuredData offers={HOME_OFFERS} homeDescription={HOME_DESCRIPTION} />
      <Hero />
      <TrendIntelligenceSection />
      <Features />
      <MultiChat />
      <Pricing />
      <Contact />
    </>
  );
}
