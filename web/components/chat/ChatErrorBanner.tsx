"use client";

import Link from "next/link";

export function ChatErrorBanner({ message }: { message: string }) {
  const lowCredits =
    message.toLowerCase().includes("insufficient credits") ||
    message.toLowerCase().includes("credits");

  return (
    <div className="border-b border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
      <p>{message}</p>
      {lowCredits && (
        <p className="mt-2">
          <Link href="/pricing" className="font-medium text-accent underline">
            View plans
          </Link>
          {" · "}
          <Link href="/credits" className="font-medium text-accent underline">
            Buy credits
          </Link>
        </p>
      )}
    </div>
  );
}
