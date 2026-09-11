import { GhanaSeoLandingPage } from "@/components/seo/GhanaSeoLandingPage";
import { GHANA_LANDING_PAGES, ghanaLandingMetadata } from "@/lib/seo/ghanaLandingPages";

const CONFIG = GHANA_LANDING_PAGES.creators;

export const metadata = ghanaLandingMetadata(CONFIG);

export default function AiForCreatorsGhanaPage() {
  return <GhanaSeoLandingPage config={CONFIG} />;
}
