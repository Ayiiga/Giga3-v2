import { Container } from "@/components/ui/Container";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AccountProfileClient = dynamic(
  () =>
    import("@/components/account/AccountProfileClient").then((m) => ({
      default: m.AccountProfileClient,
    })),
  { ssr: false, loading: () => <p className="text-center text-muted">Loading…</p> }
);

export const metadata: Metadata = {
  title: "Profile",
  description: "Your Giga3 AI account profile, credits, and wallet shortcuts.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <div className="marketing-stable section-padding pt-28">
      <Container>
        <AccountProfileClient />
      </Container>
    </div>
  );
}
