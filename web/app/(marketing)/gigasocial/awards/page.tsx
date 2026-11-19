import { Container } from "@/components/ui/Container";
import { ProductSeoHeader } from "@/components/seo/ProductSeoHeader";
import { JsonLd } from "@/components/seo/JsonLd";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { AwardsHubClient } from "@/components/gigasocial/awards/AwardsHubClient";

export const metadata = publicMetadata({
  path: "/gigasocial/awards",
  title: "GigaSocial Awards — Creator recognition for Ghana & Africa",
  description:
    "GigaSocial Awards: free nominations, free fraud-resistant voting, optional promotional packages, and sponsor-funded prizes. Operated by Giga3 AI.",
  index: true,
});

const awardsFaq = [
  { question: "What are the GigaSocial Awards?", answer: "GigaSocial Awards is a creator-recognition programme operated by Giga3 AI, with a focus on original work and creators in Ghana and Africa." },
  { question: "Are nominations and voting free?", answer: "Nominations and voting are free. Optional promotional packages do not buy votes or guarantee a nomination, shortlist place or prize." },
  { question: "When can I participate?", answer: "Check the live season panel on this page for published status, participation rules and announcements. The planned December 2026 edition is pending confirmation; do not assume nominations or voting are open." },
  { question: "Are prizes and winners confirmed?", answer: "Only published season announcements confirm dates, eligibility, sponsor-funded prizes and results. A promotional package is not a promise of an award or a prize." },
];

export default function GigaSocialAwardsPage() {
  return (
    <>
      <JsonLd webPage={{ path: "/gigasocial/awards/", name: "GigaSocial Awards", description: "Creator recognition, free nominations and voting, participation guidance and published season announcements from Giga3 AI." }} />
      <JsonLd faq={awardsFaq} />
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "GigaSocial", path: "/gigasocial" },
          { name: "Awards", path: "/gigasocial/awards" },
        ]}
      />
      <ProductSeoHeader
        compact
        title="GigaSocial Awards"
        description="Recognise creators across Ghana — free to enter, free to vote. Packages never buy votes."
        showProductNav={false}
      />
      <main className="gigasocial-page-shell marketing-stable w-full px-3 pb-10 pt-4 sm:px-6">
        <Container className="!px-0">
          <section
            id="december-2026"
            aria-labelledby="december-awards-title"
            className="mb-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-violet-950 sm:p-7"
          >
            <h2 id="december-awards-title" className="text-xl font-bold sm:text-2xl">
              GigaSocial Awards — December 2026 Creator Edition
            </h2>
            <p className="mt-2">
              We’re preparing a December edition to recognise creators in Ghana. If you create
              original content, start choosing the posts that best show your work.
            </p>
            <p className="mt-2">
              December nominations and voting are pending. Dates and participation rules will be
              posted here when confirmed.
            </p>
            <a
              href="/contact/"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-violet-700 px-4 font-semibold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-800"
            >
              Ask about December sponsorship
            </a>
            <p className="mt-3">
              <a href="/blog/how-to-make-money-as-a-content-creator-in-ghana/" className="font-semibold underline">
                Read the Ghana creator earnings and December Awards guide
              </a>
            </p>
          </section>
          <section aria-labelledby="awards-guide" className="mb-6 rounded-2xl border border-border bg-white p-5 text-slate-900 sm:p-7">
            <h2 id="awards-guide" className="text-2xl font-bold">Creator recognition: how to get involved</h2>
            <p className="mt-3 leading-7">GigaSocial gives creators a place to share original work and build an audience. The Awards programme recognises creative contributions through published seasons, with participation governed by each season’s rules.</p>
            <ol className="mt-4 list-decimal space-y-3 pl-6 leading-7">
              <li>Choose original posts that demonstrate your work and confirm that you have permission to share any included media.</li>
              <li>Read the published season rules, categories and eligibility before applying. Watch the live panel below for announcements.</li>
              <li>When nominations open, use the official application flow. Voting availability follows the published season status.</li>
              <li>Follow the official updates for shortlists, results and any confirmed sponsor-funded prizes.</li>
            </ol>
            <nav aria-label="Creator resources" className="mt-5 flex flex-wrap gap-4 font-semibold text-violet-800 underline">
              <a href="/gigasocial/">Explore GigaSocial</a>
              <a href="/creator-studio/">Prepare your content</a>
              <a href="/gigalearn/academy/">Learn practical creative and digital skills</a>
              <a href="/contact/">Contact the Awards team</a>
            </nav>
          </section>
          <section aria-labelledby="awards-faq" className="mb-6 rounded-2xl border border-border p-5 sm:p-7">
            <h2 id="awards-faq" className="text-2xl font-bold">GigaSocial Awards questions</h2>
            {awardsFaq.map(item => <div key={item.question} className="mt-5"><h3 className="font-semibold">{item.question}</h3><p className="mt-2 leading-7">{item.answer}</p></div>)}
          </section>
          <AwardsHubClient />
        </Container>
      </main>
    </>
  );
}
