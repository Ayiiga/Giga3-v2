import { GhanaSeoLandingPage } from "@/components/seo/GhanaSeoLandingPage";
import { GHANA_LANDING_PAGES, ghanaLandingMetadata } from "@/lib/seo/ghanaLandingPages";

const CONFIG = GHANA_LANDING_PAGES.business;

export const metadata = ghanaLandingMetadata(CONFIG);

export default function AiForBusinessGhanaPage() {
  return <GhanaSeoLandingPage config={CONFIG} />;
}
