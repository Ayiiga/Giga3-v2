import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] items-center section-padding">
      <Container className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
          <WifiOff className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-bold">You&apos;re offline</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          This page is available from cache. Reconnect to load fresh content or
          return to the home page.
        </p>
        <ButtonLink href="/" variant="primary" className="mt-8">
          Back to home
        </ButtonLink>
      </Container>
    </div>
  );
}
