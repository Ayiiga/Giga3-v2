import Link from "next/link";
import { GhanaSeoLandingPage } from "@/components/seo/GhanaSeoLandingPage";
import {
  GHANA_LANDING_PAGES,
  ghanaLandingMetadata,
} from "@/lib/seo/ghanaLandingPages";

const CONFIG = GHANA_LANDING_PAGES.teachers;

export const metadata = ghanaLandingMetadata(CONFIG);

export default function AiForTeachersGhanaPage() {
  return (
    <>
      <GhanaSeoLandingPage config={CONFIG} />
      <section className="mx-auto max-w-3xl space-y-3 px-5 pb-28">
        <h2 className="text-xl font-semibold">
          Take the sample to your classroom
        </h2>
        <p className="text-sm leading-6">
          Original example by the Giga3 AI editorial team · Updated 19 November
          2026. Adapt the lesson to your learners and current curriculum.
        </p>
        <a
          className="inline-block rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white"
          href="/downloads/jhs1-english-subject-verb-agreement.txt"
          download
        >
          Download the sample lesson and prompt
        </a>
        <p>
          <Link className="text-violet-800 underline" href="/chat/">
            Use the prompt in AI Chat
          </Link>
        </p>
      </section>
    </>
  );
}
