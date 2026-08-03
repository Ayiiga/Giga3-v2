"use client";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { memo, useEffect } from "react";
import { createPortal } from "react-dom";

export const GigaSocialAuthPrompt = memo(function GigaSocialAuthPrompt({
  title = "Join GigaSocial",
  description = "Sign in to post, comment, like, save, remix, follow, and message.",
  nextPath = "/gigasocial/",
  className,
  variant = "card",
  onDismiss,
}: {
  title?: string;
  description?: string;
  nextPath?: string;
  className?: string;
  variant?: "card" | "modal";
  onDismiss?: () => void;
}) {
  const next = encodeURIComponent(nextPath);

  useEffect(() => {
    if (variant !== "modal" || !onDismiss) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss, variant]);

  const card = (
    <div
      className={cn("gigasocial-auth-prompt", className)}
      role="dialog"
      aria-modal={variant === "modal" ? true : undefined}
      aria-label={title}
    >
      {onDismiss ? (
        <button
          type="button"
          className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--gs-muted,#94a3b8)] hover:text-[var(--gs-text,#fff)]"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href={`/chat/login?next=${next}`} className="min-h-12 min-w-[8rem]">
          Sign in
        </ButtonLink>
        <ButtonLink
          href={`/chat/login?next=${next}`}
          variant="outline"
          className="min-h-12 min-w-[8rem] border-[var(--gs-border)] bg-transparent text-[var(--gs-text)]"
        >
          Create account
        </ButtonLink>
      </div>
    </div>
  );

  if (variant !== "modal") return card;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="gigasocial-auth-modal" role="presentation">
      <button
        type="button"
        className="gigasocial-auth-modal__backdrop"
        aria-label="Dismiss sign in prompt"
        onClick={onDismiss}
      />
      <div className="gigasocial-auth-modal__panel">{card}</div>
    </div>,
    document.body
  );
});
