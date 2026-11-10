import { AwardsHomeBanner } from "@/components/gigasocial/awards/AwardsHomeBanner";
import { Contact } from "@/components/sections/Contact";
import { ExamPracticePreview } from "@/components/sections/ExamPracticePreview";
import { Hero } from "@/components/sections/Hero";
import { SiteStructuredData } from "@/components/seo/SiteStructuredData";
import { Pricing } from "@/components/sections/Pricing";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";
import { FREE_SIGNUP_HREF } from "@/lib/payments/marketingPricing";

const HOME_DESCRIPTION =
  "Prepare for BECE and WASSCE, create AI images and social posts, and get help with everyday work. Giga3 AI is built in Ghana, with plans priced in Ghana cedis.";

const HOME_TITLE = "Giga3 AI | BECE & WASSCE Practice, AI Chat and Creation";

export const metadata = publicMetadata({
  path: "/",
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
});

/** Offers mirror the visible homepage pricing teaser (Free and paid plans); Enterprise is quote-based. */
const HOME_OFFERS = [
  {
    name: "Free",
    price: 0,
    priceCurrency: "GHS",
    description: `${FREE_STARTER_CREDITS} starter credits`,
    path: FREE_SIGNUP_HREF,
  },
  ...Object.values(SUBSCRIPTION_PLANS).map((plan) => ({
    name: `${plan.label} (monthly)`,
    price: plan.priceGhs,
    priceCurrency: "GHS",
    description: `${plan.credits} credits per month`,
    path: "/pricing/",
  })),
];

export default function HomePage() {
  return (
    <>
      <SiteStructuredData offers={HOME_OFFERS} homeDescription={HOME_DESCRIPTION} homeTitle={HOME_TITLE} />
      <Hero />
      <ExamPracticePreview />
      <Pricing />
      <AwardsHomeBanner />
      <Contact />
    </>
  );
}
