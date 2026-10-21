"use client";

import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Shield } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

/**
 * Required once per account: birth month + year for age-appropriate access.
 * Does not collect government ID documents.
 */
export function AgeGateModal() {
  const sessionToken = getSessionToken();
  const access = useQuery(
    api.childSafety.getAgeAccess,
    sessionToken ? { sessionToken } : "skip"
  );
  const setAge = useMutation(api.childSafety.setAgeAttestation);
  const yearNow = new Date().getUTCFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = yearNow; y >= yearNow - 100; y -= 1) list.push(y);
    return list;
  }, [yearNow]);

  const [birthMonth, setBirthMonth] = useState(1);
  const [birthYear, setBirthYear] = useState(yearNow - 16);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!sessionToken || access === undefined || access === null) return null;
  if (access.hasAttestation) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sessionToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await setAge({ sessionToken, birthYear, birthMonth });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900"
      >
        <div className="mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <Shield className="h-5 w-5" aria-hidden />
          <h2 id="age-gate-title" className="text-lg font-semibold">
            Confirm your age
          </h2>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Giga3 AI includes learning tools for children and social features for older
          users. Enter your birth month and year so we can keep younger learners safe.
          We do not ask for ID documents.
        </p>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">Month</span>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={birthMonth}
              onChange={(e) => setBirthMonth(Number(e.target.value))}
              required
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-zinc-700 dark:text-zinc-200">Year</span>
            <select
              className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={birthYear}
              onChange={(e) => setBirthYear(Number(e.target.value))}
              required
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p className="mb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Saving…" : "Continue"}
        </Button>
        <p className="mt-3 text-xs text-zinc-500">
          Under 13: GigaLearn and age-appropriate Chat stay available. Public social
          posting and direct messaging stay off.
        </p>
      </form>
    </div>
  );
}
