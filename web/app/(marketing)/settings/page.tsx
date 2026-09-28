import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AccountSettingsClient = dynamic(
  () =>
    import("@/components/account/AccountSettingsClient").then((m) => ({
      default: m.AccountSettingsClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Settings",
  description: "Theme, account, and sign-out settings for Giga3 AI.",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <AccountSettingsClient />
      </Container>
    </div>
  );
}
