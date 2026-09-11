import { ButtonLink } from "@/components/ui/Button";

type ProductSignInPromptProps = {
  productName: string;
  description: string;
  nextPath: string;
};

/** Inline sign-in gate for marketing product pages — keeps SSR shell visible. */
export function ProductSignInPrompt({
  productName,
  description,
  nextPath,
}: ProductSignInPromptProps) {
  const next = encodeURIComponent(nextPath);

  return (
    <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
      <h2 className="text-lg font-semibold text-foreground">Sign in to use {productName}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ButtonLink href={`/chat/login?next=${next}`}>Sign in</ButtonLink>
        <ButtonLink href={`/chat/login?next=${next}`} variant="secondary">
          Create account
        </ButtonLink>
      </div>
    </div>
  );
}
