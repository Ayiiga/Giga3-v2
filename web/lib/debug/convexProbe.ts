"use client";

/**
 * Convex diagnostics (enable with ?convexProbe=1 or localStorage giga3_convex_probe=1).
 * Kill-switch: ?noConvexQueries=1 skips all useQuery + media polling.
 * Full disconnect: ?noConvexClient=1 closes WS and skips queries (tests reconnect vs query churn).
 */

declare global {
  interface Window {
    __giga3ConvexProbe?: ConvexProbeSnapshot;
  }
}

export type ConvexProbeSnapshot = {
  connectionState: Record<string, unknown>;
  reconnectsPerMinute: number;
  connectionTransitions: number;
  querySubscriptions: Record<string, number>;
  queryResultUpdates: Record<string, number>;
  pollExecutions: number;
  pollErrors: number;
  lastMinute: {
    reconnects: number;
    queryUpdates: number;
    connectionTransitions: number;
  };
};

const querySubs = new Map<string, number>();
const queryUpdates = new Map<string, number>();
let pollExecutions = 0;
let pollErrors = 0;

let connectionTransitions = 0;
let reconnectsTotal = 0;
let lastConnectionCount = 0;

const minuteWindow = {
  reconnects: 0,
  queryUpdates: 0,
  connectionTransitions: 0,
  startedAt: Date.now(),
};

let lastConnectionSnapshot: Record<string, unknown> = {};
let minuteTimer: ReturnType<typeof setInterval> | null = null;

function syncWindow(): void {
  if (typeof window === "undefined") return;
  window.__giga3ConvexProbe = {
    connectionState: lastConnectionSnapshot,
    reconnectsPerMinute: minuteWindow.reconnects,
    connectionTransitions,
    querySubscriptions: Object.fromEntries(querySubs),
    queryResultUpdates: Object.fromEntries(queryUpdates),
    pollExecutions,
    pollErrors,
    lastMinute: { ...minuteWindow },
  };
}

function ensureMinuteLogger(): void {
  if (minuteTimer || typeof window === "undefined") return;
  minuteTimer = window.setInterval(() => {
    if (!isConvexProbeEnabled()) return;
    console.info("[giga3-convex] 60s window", {
      reconnects: minuteWindow.reconnects,
      queryUpdates: minuteWindow.queryUpdates,
      connectionTransitions: minuteWindow.connectionTransitions,
      topQueryUpdates: [...queryUpdates.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8),
      connectionState: lastConnectionSnapshot,
    });
    minuteWindow.reconnects = 0;
    minuteWindow.queryUpdates = 0;
    minuteWindow.connectionTransitions = 0;
    minuteWindow.startedAt = Date.now();
    syncWindow();
  }, 60_000);
}

function searchFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get(name) === "1";
  } catch {
    return false;
  }
}

export function isConvexProbeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (searchFlag("convexProbe")) return true;
    if (process.env.NODE_ENV !== "production") {
      return window.localStorage.getItem("giga3_convex_probe") === "1";
    }
    return false;
  } catch {
    return false;
  }
}

/** Skip every useQuery subscription and media poll (WS may still connect). */
export function isConvexQueriesDisabled(): boolean {
  return searchFlag("noConvexQueries");
}

/** Close Convex client and skip queries — tests WS reconnect vs query-driven shake. */
export function isNoConvexClientEnabled(): boolean {
  return searchFlag("noConvexClient");
}

export function recordQueryMount(queryName: string): void {
  if (!isConvexProbeEnabled()) return;
  querySubs.set(queryName, (querySubs.get(queryName) ?? 0) + 1);
  syncWindow();
  ensureMinuteLogger();
}

export function recordQueryResultUpdate(queryName: string): void {
  if (!isConvexProbeEnabled()) return;
  queryUpdates.set(queryName, (queryUpdates.get(queryName) ?? 0) + 1);
  minuteWindow.queryUpdates += 1;
  syncWindow();
}

export function recordPollExecution(): void {
  if (!isConvexProbeEnabled()) return;
  pollExecutions += 1;
  syncWindow();
}

export function recordPollError(): void {
  if (!isConvexProbeEnabled()) return;
  pollErrors += 1;
  syncWindow();
}

export function recordConnectionState(state: {
  isWebSocketConnected: boolean;
  connectionCount: number;
  connectionRetries: number;
  hasInflightRequests: boolean;
  inflightMutations: number;
  inflightActions: number;
}): void {
  if (!isConvexProbeEnabled()) return;

  const snapshot = {
    isWebSocketConnected: state.isWebSocketConnected,
    connectionCount: state.connectionCount,
    connectionRetries: state.connectionRetries,
    hasInflightRequests: state.hasInflightRequests,
    inflightMutations: state.inflightMutations,
    inflightActions: state.inflightActions,
  };

  const changed =
    JSON.stringify(snapshot) !== JSON.stringify(lastConnectionSnapshot);
  if (changed) {
    connectionTransitions += 1;
    minuteWindow.connectionTransitions += 1;
    if (state.connectionCount > lastConnectionCount) {
      const delta = state.connectionCount - lastConnectionCount;
      reconnectsTotal += delta;
      minuteWindow.reconnects += delta;
    }
    lastConnectionCount = state.connectionCount;
    lastConnectionSnapshot = snapshot;
    console.info("[giga3-convex] connection", snapshot);
    syncWindow();
  }
  ensureMinuteLogger();
}

export function resetConvexProbe(): void {
  querySubs.clear();
  queryUpdates.clear();
  pollExecutions = 0;
  pollErrors = 0;
  connectionTransitions = 0;
  reconnectsTotal = 0;
  lastConnectionCount = 0;
  lastConnectionSnapshot = {};
  minuteWindow.reconnects = 0;
  minuteWindow.queryUpdates = 0;
  minuteWindow.connectionTransitions = 0;
  syncWindow();
}
