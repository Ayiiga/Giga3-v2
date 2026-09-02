import type { Metadata } from "next";
import { ChatResetPasswordClient } from "@/components/chat/ChatResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Set a new Giga3 AI password using the secure link from your email.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/chat/login/reset/" },
};

export default function ResetPasswordPage() {
  return <ChatResetPasswordClient />;
}
