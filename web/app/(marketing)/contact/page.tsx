import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/lib/site";
import { publicMetadata } from "@/lib/seo/publicMetadata";

export const metadata = publicMetadata({
  path: "/contact",
  title: "Contact Giga3 AI — Support, Sales and Security",
  description:
    "Reach the Giga3 AI team in Ghana: support for your account or billing, enterprise and education workspaces, partnerships, and responsible security disclosure.",
});

const CHANNELS = [
  {
    title: "Support",
    body: "Account, credits, subscriptions or Paystack payments. Include the email on your account and any payment reference.",
  },
  {
    title: "Enterprise & education",
    body: "Workspaces for schools, universities, NGOs and businesses — role-based access, classrooms and organisation dashboards.",
  },
  {
    title: "Security",
    body: "Report a vulnerability responsibly. Please give us reasonable time to investigate before public disclosure.",
  },
];

export default function ContactPage() {
  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-3xl">
            <h1 className="page-title">Contact Giga3 AI</h1>
            <p className="section-lead mt-4">
              We are based in {siteConfig.founder.location} and reply by email. One address covers
              support, sales and security so nothing gets lost.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`mailto:${siteConfig.contact.email}`} size="lg">
                Email {siteConfig.contact.email}
              </ButtonLink>
              <ButtonLink href="/#contact" variant="secondary" size="lg">
                Use the contact form
              </ButtonLink>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {CHANNELS.map((c) => (
                <li key={c.title} className="rounded-2xl border border-border p-5 text-sm">
                  <h2 className="font-semibold text-foreground">{c.title}</h2>
                  <p className="mt-2 leading-relaxed text-muted">{c.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-muted">
              Before writing, the{" "}
              <Link href="/legal/refunds/" className="text-accent underline">
                refund and cancellation policy
              </Link>
              ,{" "}
              <Link href="/legal/security/" className="text-accent underline">
                security overview
              </Link>{" "}
              and{" "}
              <Link href="/features/" className="text-accent underline">
                feature overview
              </Link>{" "}
              answer the most common questions.
            </p>
          </div>
        </Container>
      </div>
    </>
  );
}
