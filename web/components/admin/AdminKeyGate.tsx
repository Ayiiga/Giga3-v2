"use client";

import { Button } from "@/components/ui/Button";

type AdminKeyGateProps = {
  ready: boolean;
  authorized: boolean;
  error: string | null;
  pendingKey: string;
  onPendingKeyChange: (value: string) => void;
  onSubmit: () => void;
  title?: string;
};

/** Prompt for admin key without putting secrets in the URL. */
export function AdminKeyGate({
  ready,
  authorized,
  error,
  pendingKey,
  onPendingKeyChange,
  onSubmit,
  title = "Admin access",
}: AdminKeyGateProps) {
  if (!ready) {
    return <p className="text-center text-muted">Loading…</p>;
  }

  if (authorized) return null;

  return (
    <div className="mx-auto max-w-lg rounded-2xl border bg-card p-8">
      <h1 className="text-2xl font-semibold text-center">{title}</h1>
      <p className="mt-3 text-sm text-muted text-center">
        Enter your platform admin key. It is stored only for this browser tab session — not in the URL.
      </p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <input
          type="password"
          autoComplete="off"
          value={pendingKey}
          onChange={(e) => onPendingKeyChange(e.target.value)}
          placeholder="Admin key"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        <Button type="submit" className="w-full">
          Unlock dashboard
        </Button>
      </form>
    </div>
  );
}
