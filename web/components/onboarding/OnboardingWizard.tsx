"use client";

import { Button } from "@/components/ui/Button";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { USER_ROLES, type UserRoleId } from "@/lib/vision";
import { siteConfig } from "@/lib/site";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to Giga3" },
  { id: "role", title: "Tell us about you" },
  { id: "features", title: "Explore features" },
  { id: "actions", title: "Suggested first steps" },
] as const;

const ROLE_ACTIONS: Record<UserRoleId, { label: string; href: string; tip: string }[]> = {
  student: [
    { label: "Start a study chat", href: "/chat?mode=research", tip: "Ask Giga3 to explain any topic step by step" },
    { label: "Open GigaLearn", href: "/gigalearn", tip: "Build study plans and homework helpers" },
    { label: "Check your wallet", href: "/wallet", tip: "Track your free starter credits" },
  ],
  teacher: [
    { label: "Create lesson content", href: "/creator-studio", tip: "Generate lesson plans and materials" },
    { label: "Enterprise workspace", href: "/workspace", tip: "Manage classes and assignments" },
    { label: "Start teaching chat", href: "/chat?mode=writing", tip: "Draft rubrics and feedback" },
  ],
  parent: [
    { label: "Homework help chat", href: "/chat", tip: "Support your child's learning" },
    { label: "GigaLearn resources", href: "/gigalearn", tip: "Educational content for families" },
    { label: "Wallet & credits", href: "/wallet", tip: "Manage family usage" },
  ],
  creator: [
    { label: "Creator Studio", href: "/creator-studio", tip: "Write, design, and publish content" },
    { label: "Media Studio", href: "/media", tip: "Generate images with AI" },
    { label: "Sell on Marketplace", href: "/marketplace/sell", tip: "Monetize your digital products" },
  ],
  business: [
    { label: "Automation workflows", href: "/automation", tip: "Automate repetitive tasks" },
    { label: "Business chat", href: "/chat?mode=writing", tip: "Draft documents and emails" },
    { label: "Enterprise options", href: "/enterprise", tip: "Scale for your organization" },
  ],
  developer: [
    { label: "Coding assistant", href: "/chat?mode=coding", tip: "Debug and build with AI" },
    { label: "Automation", href: "/automation", tip: "Create technical workflows" },
    { label: "API & integrations", href: "/automation", tip: "Connect Giga3 to your stack" },
  ],
  enterprise: [
    { label: "Enterprise dashboard", href: "/enterprise", tip: "Volume pricing and SLAs" },
    { label: "Org workspace", href: "/workspace", tip: "Teams, classes, and roles" },
    { label: "Contact sales", href: "/#contact", tip: "Dedicated onboarding support" },
  ],
  general: [
    { label: "Start chatting", href: "/chat", tip: "Your AI assistant is ready" },
    { label: "Explore features", href: "/#features", tip: "Discover what Giga3 can do" },
    { label: "Install the app", href: "/install", tip: "Add Giga3 to your home screen" },
  ],
};

type OnboardingWizardProps = {
  onComplete: (role: UserRoleId, stepsSeen: string[]) => void;
  onDismiss: () => void;
};

export function OnboardingWizard({ onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRoleId>("general");
  const stepsSeen = ONBOARDING_STEPS.slice(0, step + 1).map((s) => s.id);

  const current = ONBOARDING_STEPS[step];
  const isLast = step === ONBOARDING_STEPS.length - 1;
  const actions = ROLE_ACTIONS[role];

  function next() {
    if (isLast) {
      onComplete(role, [...stepsSeen, current.id]);
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Onboarding">
      <div className="premium-card w-full max-w-lg p-6 sm:p-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-accent">
              Step {step + 1} of {ONBOARDING_STEPS.length}
            </p>
            <h2 className="mt-1 text-xl font-semibold">{current.title}</h2>
          </div>
          <button type="button" onClick={onDismiss} className="rounded-lg p-1 text-muted hover:bg-muted/50" aria-label="Dismiss onboarding">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <VisionTagline />
            <p className="text-sm text-muted">
              Welcome to {siteConfig.name}! We&apos;ll personalize your experience based on how you plan to use the platform.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-2">
            {USER_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  role === r.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/30"
                }`}
                onClick={() => setRole(r.id)}
              >
                <span className="font-medium">{r.label}</span>
                <p className="mt-0.5 text-xs text-muted">{r.description}</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <ul className="space-y-2 text-sm">
            {[
              { name: "Chat", desc: "Multi-provider AI with automatic failover" },
              { name: "GigaLearn", desc: "Education and study tools" },
              { name: "Creator Studio", desc: "Content and media creation" },
              { name: "Marketplace", desc: "Buy and sell digital products" },
              { name: "Wallet", desc: "Credits, billing, and usage" },
            ].map((f) => (
              <li key={f.name} className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="font-medium">{f.name}</p>
                  <p className="text-xs text-muted">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {step === 3 && (
          <div className="space-y-2">
            {actions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:border-accent/30"
              >
                <div>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-muted">{a.tip}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" aria-hidden />
              </Link>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={next}>
            {isLast ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Get started
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
