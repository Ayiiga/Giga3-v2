"use client";

import {
  flushGigaEditSyncQueue,
  GIGAEDIT_OFFLINE_CAPABILITIES,
  isGigaEditOnline,
  listGigaEditSyncQueue,
} from "@/lib/gigaedit/offline";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function OfflineManager({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(true);
  const [queueLen, setQueueLen] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setOnline(isGigaEditOnline());
    setQueueLen(listGigaEditSyncQueue().length);
  }, []);

  useEffect(() => {
    refresh();
    function onChange() {
      refresh();
      if (navigator.onLine) {
        void flushGigaEditSyncQueue().then((r) => {
          if (r.flushed > 0) {
            setStatus(`Synced ${r.flushed} local backup item${r.flushed === 1 ? "" : "s"}.`);
            refresh();
          }
        });
      }
    }
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    window.addEventListener("giga3:gigaedit-sync-changed", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      window.removeEventListener("giga3:gigaedit-sync-changed", onChange);
    };
  }, [refresh]);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
          online
            ? "border-[var(--ge-border)] text-[var(--ge-muted)]"
            : "border-amber-400/40 bg-amber-400/10 text-amber-100"
        }`}
        role="status"
      >
        {online ? <Wifi className="h-3.5 w-3.5" aria-hidden /> : <CloudOff className="h-3.5 w-3.5" aria-hidden />}
        <span>{online ? "Online · local drafts auto-save" : "Offline mode · editing stays on this device"}</span>
        {queueLen > 0 ? <span className="ml-auto text-[var(--ge-gold)]">{queueLen} queued</span> : null}
      </div>
    );
  }

  return (
    <div className="gigaedit-glass space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Offline & sync</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--ge-border)] px-2 py-1 text-xs text-[var(--ge-muted)]"
          onClick={() => {
            void flushGigaEditSyncQueue().then((r) => {
              setStatus(r.flushed ? `Flushed ${r.flushed} items.` : "Nothing to sync.");
              refresh();
            });
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Sync now
        </button>
      </div>
      <p className="text-xs text-[var(--ge-muted)]">
        {online
          ? "Connected. Projects stay private on-device; cloud backup can attach later without changing auth."
          : "You’re offline. Creative tools below still work from IndexedDB / local cache."}
      </p>
      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {GIGAEDIT_OFFLINE_CAPABILITIES.map((cap) => (
          <li key={cap} className="rounded-lg bg-black/20 px-2.5 py-1.5 text-xs text-[var(--ge-muted)]">
            ✅ {cap}
          </li>
        ))}
      </ul>
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
