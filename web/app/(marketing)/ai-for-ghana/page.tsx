import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, type FaqItem } from "@/components/seo/JsonLd";
import {
  FREE_STARTER_CREDITS,
  SUBSCRIPTION_PLANS,
} from "@/lib/payments/subscriptionCatalog";
import { publicMetadata } from "@/lib/seo/publicMetadata";

const PATH = "/ai-for-ghana";

export const metadata = publicMetadata({
  path: PATH,
  title: "AI for Students, Creators and Businesses in Ghana — Giga3 AI",
  description:
    "Giga3 AI is an AI platform from Ghana for learning, research, coding and creativity. Start free with 25 credits; paid plans billed in GHS via Paystack.",
});

const PLAN_LINES = [
  {
    name: "Free",
    price: "GHS 0",
    detail: `${FREE_STARTER_CREDITS} credits`,
  },
  ...(["basic", "pro", "premium"] as const).map((id) => ({
    name: SUBSCRIPTION_PLANS[id].label,
    price: `GHS ${SUBSCRIPTION_PLANS[id].priceGhs}/month`,
    detail: `${SUBSCRIPTION_PLANS[id].credits} credits`,
  })),
  {
    name: "Enterprise",
    price: "Custom",
    detail: "Designed for organizations with specific requirements",
  },
];

const PAID_PLAN_SUMMARY = (["basic", "pro", "premium"] as const)
  .map(
    (id) =>
      `${SUBSCRIPTION_PLANS[id].label} at GHS ${SUBSCRIPTION_PLANS[id].priceGhs} per month with ${SUBSCRIPTION_PLANS[id].credits} credits`
  )
  .join(", ");

const FAQ: FaqItem[] = [
  {
    question: "What is Giga3 AI?",
    answer:
      "Giga3 AI is an AI platform from Ghana for learning, research, coding, creativity and productivity. It brings multiple AI-powered capabilities together in one platform.",
  },
  {
    question: "How much does Giga3 AI cost?",
    answer: `Giga3 AI has a Free plan at GHS 0 with ${FREE_STARTER_CREDITS} credits, paid plans (${PAID_PLAN_SUMMARY}), and a Custom Enterprise plan. Paid billing is supported through Paystack in GHS.`,
  },
  {
    question: "Can students in Ghana use Giga3 AI?",
    answer: `Yes. Giga3 AI is designed for students and other users in Ghana, with a free plan that provides ${FREE_STARTER_CREDITS} credits to help users get started with AI-assisted learning, research and productivity.`,
  },
];

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-base leading-relaxed text-muted">{children}</p>;
}

export default function AiForGhanaPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "AI for Ghana", path: PATH },
        ]}
      />
      <JsonLd faq={FAQ} />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <article className="mx-auto max-w-3xl">
            <header>
              <h1 className="page-title">
                AI for Students, Creators and Businesses in Ghana
              </h1>
              <p className="section-lead mt-4">
                Giga3 AI is an AI platform from Ghana built to help students, creators, developers,
                researchers and businesses learn, research, code and create with powerful artificial
                intelligence tools in one place.
              </p>
            </header>

            <div className="mt-8 space-y-5">
              <Prose>
                Whether you are a university student working on an assignment, a creator developing
                content, a developer writing code, or a business looking for smarter digital
                workflows, Giga3 AI gives you practical AI tools designed for everyday use.
              </Prose>
              <p className="text-lg font-semibold text-foreground">
                Built in Africa. Powered by AI. Designed for Everyone.
              </p>
              <Prose>
                Giga3 AI brings AI chat, learning, research, coding, creative tools and other
                productivity features together in a simple Progressive Web App (PWA) that works across
                modern devices.
              </Prose>
            </div>

            <section className="mt-12 space-y-5">
              <h2 className="text-xl font-semibold text-foreground">Powerful AI Tools for Learning and Productivity</h2>
              <Prose>
                Students in Ghana often need AI for research, studying, writing, brainstorming, coding
                and understanding difficult subjects. Giga3 AI helps bring these tasks into one
                convenient platform.
              </Prose>
              <Prose>
                You can use AI to explain complex concepts in simpler language, generate ideas,
                organize information, improve drafts and support your learning process.
              </Prose>
              <Prose>
                For creators, AI can help with content ideas, scripts, captions, creative concepts and
                other workflows. Businesses can use AI to support research, communication,
                brainstorming and productivity.
              </Prose>
              <Prose>
                Giga3 AI is designed to be useful without requiring users to manage several separate AI
                platforms for different tasks.
              </Prose>
            </section>

            <section className="mt-12 space-y-5">
              <h2 className="text-xl font-semibold text-foreground">Multi-provider AI failover</h2>
              <Prose>
                Giga3 AI is designed with multi-provider AI resilience. Where supported by the
                platform&apos;s configuration, requests can use a provider chain such as OpenAI →
                Gemini → OpenRouter.
              </Prose>
              <Prose>
                This architecture helps reduce dependence on a single AI provider. If one configured
                provider is unavailable or encounters an eligible service issue, the platform can use
                another configured provider where appropriate.
              </Prose>
              <Prose>
                The goal is simple: provide a more reliable AI experience while giving Giga3 AI
                flexibility to work with different AI technologies.
              </Prose>
            </section>

            <section className="mt-12 space-y-5">
              <h2 className="text-xl font-semibold text-foreground">Affordable AI Pricing in Ghana</h2>
              <Prose>
                Paying for international AI services can be difficult for some users in Ghana because
                pricing is often presented in foreign currencies and payment methods may not be
                convenient locally.
              </Prose>
              <Prose>
                Giga3 AI is designed with Ghanaian users in mind, including Paystack billing in
                Ghanaian cedis (GHS) for supported paid plans.
              </Prose>
              <Prose>The current pricing structure includes:</Prose>
              <ul className="space-y-2 rounded-2xl border border-border bg-slate-50 p-5 text-base text-foreground">
                {PLAN_LINES.map((plan) => (
                  <li key={plan.name} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold">{plan.name}</span>
                    <span aria-hidden>—</span>
                    <span>{plan.price}:</span>
                    <span className="text-muted">{plan.detail}</span>
                  </li>
                ))}
              </ul>
              <Prose>
                The Free plan gives new users a practical way to start with AI without immediately
                paying for a subscription.
              </Prose>
              <Prose>
                For students and individual users, the free credits can be useful for exploring
                AI-assisted learning, research, coding and creative workflows before deciding whether a
                paid plan is appropriate.
              </Prose>
              <Prose>For organizations, Enterprise can provide a pathway for customized requirements.</Prose>
            </section>

            <section className="mt-12 space-y-5">
              <h2 className="text-xl font-semibold text-foreground">One AI Platform for Modern African Users</h2>
              <Prose>
                Giga3 AI is more than a basic chatbot. Its wider vision is to create an accessible AI
                platform for learning, research, coding and creativity.
              </Prose>
              <Prose>
                Students can use AI as a learning companion. Creators can use it to develop and refine
                ideas. Developers can use AI-assisted workflows for coding and technical
                problem-solving. Businesses can explore AI for productivity and research.
              </Prose>
              <Prose>
                The platform is delivered as a PWA, making it accessible from supported browsers
                without requiring users to depend on a traditional desktop installation.
              </Prose>
              <Prose>
                Explore the platform&apos;s capabilities on the{" "}
                <Link href="/#features" className="text-accent hover:underline">
                  Giga3 AI Features page
                </Link>{" "}
                and see the available plans on the{" "}
                <Link href="/pricing" className="text-accent hover:underline">
                  Giga3 AI Pricing page
                </Link>
                .
              </Prose>
            </section>

            <section className="mt-12" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="text-xl font-semibold text-foreground">
                Frequently Asked Questions
              </h2>
              <dl className="mt-5 space-y-4">
                {FAQ.map((item) => (
                  <div key={item.question} className="saas-card rounded-2xl border border-border p-5">
                    <dt className="font-semibold text-foreground">{item.question}</dt>
                    <dd className="mt-2 text-base leading-relaxed text-muted">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-14 rounded-3xl border border-border bg-slate-50 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Start Using Giga3 AI</h2>
              <p className="mt-3 text-base text-muted">
                Ready to explore AI for learning, research, coding and creativity?
              </p>
              <p className="mt-1 text-base font-semibold text-foreground">
                Start free with {FREE_STARTER_CREDITS} credits.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href="/chat/login" size="lg">
                  Start free
                </ButtonLink>
                <ButtonLink href="/pricing" variant="secondary" size="lg">
                  View pricing
                </ButtonLink>
              </div>
              <p className="mt-8 text-sm text-muted">
                Giga3 AI — Built in Africa. Powered by AI. Designed for Everyone.
              </p>
            </section>
          </article>
        </Container>
      </div>
    </>
  );
}
