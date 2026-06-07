import { BrandLogo } from "@/components/brand/BrandLogo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
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
          {branding.name} saved this page for you. Reconnect to load fresh content or
          return to the home page.
        </p>
        <ButtonLink href="/" variant="primary" className="mt-8">
          Back to home
        </ButtonLink>
      </Container>
    </div>
  );
}
