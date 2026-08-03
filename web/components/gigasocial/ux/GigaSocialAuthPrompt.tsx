"use client";

import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { memo } from "react";

export const GigaSocialAuthPrompt = memo(function GigaSocialAuthPrompt({
  title = "Join GigaSocial",
  description = "Sign in to post, comment, like, save, remix, follow, and message.",
  nextPath = "/gigasocial/",
  className,
}: {
  title?: string;
  description?: string;
  nextPath?: string;
  className?: string;
}) {
  const next = encodeURIComponent(nextPath);
  return (
    <div className={cn("gigasocial-auth-prompt", className)} role="dialog" aria-label={title}>
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
});
