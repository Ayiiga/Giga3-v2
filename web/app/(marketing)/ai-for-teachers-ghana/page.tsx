import { GhanaSeoLandingPage } from "@/components/seo/GhanaSeoLandingPage";
import { GHANA_LANDING_PAGES, ghanaLandingMetadata } from "@/lib/seo/ghanaLandingPages";

const CONFIG = GHANA_LANDING_PAGES.teachers;

export const metadata = ghanaLandingMetadata(CONFIG);

export default function AiForTeachersGhanaPage() {
  return <GhanaSeoLandingPage config={CONFIG} />;
}
