import { Container } from "@/components/ui/Container";
import { StableLink } from "@/components/ui/StableLink";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { HelpCircle, Mail } from "lucide-react";

export const metadata = publicMetadata({
  path: "/help",
  title: "Help & FAQ — Giga3 AI",
  description:
    "Get help with Giga3 AI chat, credits, Paystack billing, GigaLearn, Media Studio, and GigaSocial.",
  index: false,
});

const FAQ = [
  {
    q: "How do I buy credits?",
    a: "Open Buy credits from chat or visit the credits page while signed in. Payments are in GHS via Paystack.",
    href: "/credits/",
  },
  {
    q: "I forgot my password",
    a: "Use the password reset link on the chat sign-in page. We email a secure link to your account address.",
    href: "/chat/login/reset/",
  },
  {
    q: "Where are my conversations?",
    a: "Chat history is tied to your signed-in account. Open AI Chat and sign in with the same email.",
    href: "/chat/",
  },
  {
    q: "Billing or payment issue",
    a: "Email support with your account email and Paystack reference. Refund policy is in our legal centre.",
    href: "/legal/refunds/",
  },
];

export default function HelpPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container className="max-w-2xl">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <HelpCircle className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="page-title mt-4">Help &amp; FAQ</h1>
          <p className="mt-2 text-muted">
            Quick answers for chat, credits, and creator tools on Giga3 AI.
          </p>
        </header>

        <div className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <article key={item.q} className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold text-foreground">{item.q}</h2>
              <p className="mt-1 text-sm text-muted">{item.a}</p>
              <StableLink
                href={item.href}
                hard
                className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-2"
              >
                Open →
              </StableLink>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-muted/20 p-5">
          <h2 className="text-sm font-semibold text-foreground">Still need help?</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="mailto:support@giga3ai.com"
                className="inline-flex items-center gap-2 text-accent underline underline-offset-2"
              >
                <Mail className="h-4 w-4" aria-hidden />
                support@giga3ai.com
              </a>
            </li>
            <li>
              <a
                href="mailto:giga3ai@gmail.com"
                className="inline-flex items-center gap-2 text-accent underline underline-offset-2"
              >
                <Mail className="h-4 w-4" aria-hidden />
                giga3ai@gmail.com
              </a>
            </li>
            <li>
              <StableLink href="/contact/" hard className="text-accent underline underline-offset-2">
                Contact page
              </StableLink>
            </li>
          </ul>
        </section>
      </Container>
    </div>
  );
}
