"use client";

import {
  isConvexProbeEnabled,
  isConvexQueriesDisabled,
  recordQueryMount,
  recordQueryResultUpdate,
} from "@/lib/debug/convexProbe";
import { getFunctionName } from "convex/server";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";

type QueryArgs<Q extends FunctionReference<"query">> =
  | (Q extends FunctionReference<"query", "public", infer Args> ? Args : never)
  | "skip";

/**
 * useQuery wrapper for Convex root-cause investigation.
 * Honors ?noConvexQueries=1 and records subscription/refresh metrics when ?convexProbe=1.
 */
export function useProbedQuery<Q extends FunctionReference<"query">>(
  query: Q,
  args: QueryArgs<Q>
): FunctionReturnType<Q> | undefined {
  const queryName = getFunctionName(query);
  const killSwitch = isConvexQueriesDisabled();
  const effectiveArgs = killSwitch ? ("skip" as const) : args;
  const mountedRef = useRef(false);

  if (
    isConvexProbeEnabled() &&
    effectiveArgs !== "skip" &&
    !mountedRef.current
  ) {
    mountedRef.current = true;
    recordQueryMount(queryName);
  }

  const result = useQuery(query, effectiveArgs);
  const prevRef = useRef<unknown>(undefined);

  useEffect(() => {
    if (!isConvexProbeEnabled() || effectiveArgs === "skip") return;
    if (prevRef.current !== result) {
      recordQueryResultUpdate(queryName);
      prevRef.current = result;
    }
  }, [queryName, result, effectiveArgs]);

  return result;
}
