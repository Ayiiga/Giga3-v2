"use client";

import { Button } from "@/components/ui/Button";
import { ENGAGEMENT_INTERESTS } from "@/lib/engagement/interests";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type WelcomeExperienceProps = {
  onDismiss: () => void;
  onComplete: (interests: string[]) => void;
};

/**
 * Cross-product welcome modal (engagement.welcome).
 * Does not block the app; dismiss is persisted server-side.
 */
export function WelcomeExperience({ onDismiss, onComplete }: WelcomeExperienceProps) {
  const [step, setStep] = useState<"intro" | "interests">("intro");
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 8)
    );
  }

  return (
    <div
      className="fixed inset-0 z-[88] flex items-end justify-center bg-black/45 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="giga3-welcome-title"
    >
      <div className="premium-card w-full max-w-lg p-5 sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent">Welcome</p>
              <h2
                id="giga3-welcome-title"
                className="truncate text-lg font-semibold text-foreground sm:text-xl"
              >
                {step === "intro" ? "Welcome to Giga3 AI" : "What interests you?"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-muted/40"
            aria-label="Dismiss welcome"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {step === "intro" ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              Giga3 AI brings chat, GigaLearn, GigaSocial, AI Studio, Marketplace, and creator
              tools together — so you can learn, create, and share in one place.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="min-h-11"
                onClick={() => setStep("interests")}
              >
                Get Started
              </Button>
              <ButtonLinkish href="/features/" onNavigate={onDismiss}>
                Explore Giga3 AI
              </ButtonLinkish>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={onDismiss}
              >
                Not now
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Pick topics to personalize tips and recommendations. You can change these later.
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
              {ENGAGEMENT_INTERESTS.map((item) => {
                const on = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      "min-h-11 rounded-full border px-3 text-sm font-medium",
                      on
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-border bg-white text-muted hover:border-accent/30"
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                onClick={() => onComplete(selected)}
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={onDismiss}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ButtonLinkish({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-medium text-foreground hover:border-accent/30"
    >
      {children}
    </Link>
  );
}
