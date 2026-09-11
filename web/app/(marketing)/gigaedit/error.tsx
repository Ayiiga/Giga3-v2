"use client";

import { Button, ButtonLink } from "@/components/ui/Button";

export default function GigaEditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="marketing-stable section-padding">
      <div className="saas-card mx-auto max-w-lg rounded-2xl border border-border p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">GigaEdit encountered an error</h1>
        <p className="mt-2 text-sm text-muted">{error.message || "Something went wrong loading the editor."}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <ButtonLink href="/gigaedit/" variant="outline">
            Reload GigaEdit
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
