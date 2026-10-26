"use client";

import { ButtonLink } from "@/components/ui/Button";
import { rememberPostLoginPath } from "@/lib/auth/safePostLoginPath";

type ProductSignInPromptProps = {
  productName: string;
  description: string;
  nextPath: string;
};

/**
 * Inline sign-in gate for marketing product pages — keeps SSR shell visible.
 *
 * Login hrefs intentionally omit `?next=` so crawlers do not discover dozens of
 * blocked `/chat/login/?next=…` variants. The return path is stored in
 * sessionStorage on click and consumed by the login form.
 */
export function ProductSignInPrompt({
  productName,
  description,
  nextPath,
}: ProductSignInPromptProps) {
  return (
    <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Sign in to use {productName}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ButtonLink
          href="/chat/login/"
          rel="nofollow"
          onClick={() => rememberPostLoginPath(nextPath)}
        >
          Sign in
        </ButtonLink>
        <ButtonLink
          href="/chat/login/"
          variant="secondary"
          rel="nofollow"
          onClick={() => rememberPostLoginPath(nextPath)}
        >
          Create account
        </ButtonLink>
      </div>
    </div>
  );
}
