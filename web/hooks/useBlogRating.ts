"use client";

import { getOrCreateClientId } from "@/lib/analytics/clientId";
import { api } from "convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useBlogRating(slug: string) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<{
    ratingAvg: number;
    ratingCount: number;
    viewerRating: number | null;
  } | null>(null);

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  const remote = useQuery(
    api.blogStats.getRatingStats,
    clientId ? { slug, clientId } : { slug }
  );
  const submitRating = useMutation(api.blogStats.submitRating);

  const ratingAvg = local?.ratingAvg ?? remote?.ratingAvg ?? 0;
  const ratingCount = local?.ratingCount ?? remote?.ratingCount ?? 0;
  const viewerRating = local?.viewerRating ?? remote?.viewerRating ?? null;
  const loading = remote === undefined && local === null;

  async function rate(rating: number) {
    if (!clientId || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await submitRating({ slug, rating, clientId });
      if (!result.ok) {
        setError("Could not save your rating. Please try again.");
        return;
      }
      setLocal({
        ratingAvg: result.ratingAvg,
        ratingCount: result.ratingCount,
        viewerRating: result.viewerRating,
      });
    } catch {
      setError("Could not save your rating. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return {
    ratingAvg,
    ratingCount,
    viewerRating,
    loading,
    pending,
    error,
    rate,
    hasRatings: ratingCount > 0,
  };
}
