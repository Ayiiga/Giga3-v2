export const OUTBOX_STATUS_EVENT = "giga3:outbox-status";

export type OutboxStatusDetail = {
  count: number;
  syncing: boolean;
};

export function emitOutboxStatus(detail: OutboxStatusDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OutboxStatusDetail>(OUTBOX_STATUS_EVENT, { detail })
  );
}
