"use client";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";
import { Mail, Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const fromEmail = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const subject = encodeURIComponent(`Giga3 AI — message from ${name || "visitor"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${fromEmail}\n\n${message}`
    );
    window.location.href = `mailto:${siteConfig.contact.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <section id="contact" className="section-padding scroll-mt-24">
      <Container>
        <div className="glass overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:border-r lg:border-border">
              <p className="section-heading text-sm font-medium uppercase tracking-wider text-accent">
                Contact
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Let&apos;s build together
              </h2>
              <p className="section-lead">
                Questions about enterprise plans, partnerships, or custom deployments?
                We&apos;d love to hear from you.
              </p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="mt-8 inline-flex items-center gap-2 text-accent hover:underline"
              >
                <Mail aria-hidden />
                {siteConfig.contact.email}
              </a>
            </div>

            <form onSubmit={handleSubmit} className="p-8 sm:p-12">
              {submitted ? (
                <p className="text-center text-muted" role="status">
                  Thanks! We&apos;ll get back to you soon. For urgent requests, email us
                  directly.
                </p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      className="input-surface"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="input-surface"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="mb-1.5 block text-sm font-medium">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      className="input-surface resize-none"
                      placeholder="Tell us about your project..."
                    />
                  </div>
                  <Button type="submit" size="lg" className="mt-2 w-full">
                    <Send aria-hidden />
                    Send message
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </Container>
    </section>
  );
}
