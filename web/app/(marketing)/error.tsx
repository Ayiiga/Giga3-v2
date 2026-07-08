"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { toUserFacingError } from "@/lib/errors/userMessage";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="section-padding flex min-h-[50vh] flex-col items-center justify-center gap-4 pt-28 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
      <p className="max-w-md text-muted">{toUserFacingError(error)}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <ButtonLink href="/" variant="ghost">
          Back to home
        </ButtonLink>
      </div>
    </Container>
  );
}
