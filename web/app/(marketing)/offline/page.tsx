import { BrandLogo } from "@/components/brand/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { VisionTagline } from "@/components/vision/VisionTagline";
import { branding } from "@/lib/branding";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[70vh] items-center section-padding">
      <Container className="text-center">
        <div className="mx-auto flex flex-col items-center gap-4">
          <BrandLogo size={72} />
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <WifiOff className="h-6 w-6" aria-hidden />
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="mx-auto mt-3 max-w-md leading-[1.7] text-muted">
          {branding.name} keeps Chat and GigaSocial available offline after you open them
          once while online. Billing and admin tools still need a connection.
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Open a cached surface below, or reconnect for live AI replies and new posts.
        </p>
        <VisionTagline className="mx-auto mt-4 max-w-md" variant="subtle" />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/chat/" variant="primary">
            Open chat
          </ButtonLink>
          <ButtonLink href="/gigasocial/" variant="secondary">
            Open GigaSocial
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Back to home
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
