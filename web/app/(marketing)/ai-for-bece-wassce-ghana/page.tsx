import { GhanaSeoLandingPage } from "@/components/seo/GhanaSeoLandingPage";
import { GHANA_LANDING_PAGES, ghanaLandingMetadata } from "@/lib/seo/ghanaLandingPages";

const CONFIG = GHANA_LANDING_PAGES.beceWassce;

export const metadata = ghanaLandingMetadata(CONFIG);

export default function AiForBeceWassceGhanaPage() {
  return <GhanaSeoLandingPage config={CONFIG} />;
}
