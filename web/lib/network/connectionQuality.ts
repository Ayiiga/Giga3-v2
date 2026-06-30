/** Connection tiers for adaptive polling and retries on high-latency mobile networks. */

export type ConnectionTier = "offline" | "slow" | "normal";

export type NetworkConnectionInfo = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

export function readConnectionInfo(): NetworkConnectionInfo {
  if (typeof navigator === "undefined") return {};
  const conn = (navigator as Navigator & { connection?: NetworkConnectionInfo }).connection;
  if (!conn) return {};
  return {
    effectiveType: conn.effectiveType,
    saveData: conn.saveData,
    downlink: conn.downlink,
  };
}

export function connectionTierFromInfo(
  online: boolean,
  info: NetworkConnectionInfo
): ConnectionTier {
  if (!online) return "offline";
  const et = info.effectiveType?.toLowerCase();
  if (et === "slow-2g" || et === "2g") return "slow";
  if (info.saveData) return "slow";
  if (typeof info.downlink === "number" && info.downlink > 0 && info.downlink < 0.5) {
    return "slow";
  }
  return "normal";
}

export function isSlowConnectionTier(tier: ConnectionTier): boolean {
  return tier === "slow";
}
