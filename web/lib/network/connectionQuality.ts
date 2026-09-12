/** Connection tiers for adaptive polling and retries on high-latency mobile networks. */

export type ConnectionTier = "offline" | "slow" | "normal";

export type NetworkConnectionInfo = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
};

export function readConnectionInfo(): NetworkConnectionInfo {
  if (typeof navigator === "undefined") return {};
  const conn = (navigator as Navigator & {
    connection?: NetworkConnectionInfo & { rtt?: number };
  }).connection;
  if (!conn) return {};
  return {
    effectiveType: conn.effectiveType,
    saveData: conn.saveData,
    downlink: conn.downlink,
    rtt: conn.rtt,
  };
}

export function connectionTierFromInfo(
  online: boolean,
  info: NetworkConnectionInfo
): ConnectionTier {
  if (!online) return "offline";
  const et = info.effectiveType?.toLowerCase();
  if (et === "slow-2g" || et === "2g" || et === "3g") return "slow";
  if (info.saveData) return "slow";
  const conn = info as NetworkConnectionInfo & { rtt?: number };
  if (typeof conn.rtt === "number" && conn.rtt > 800) return "slow";
  if (typeof info.downlink === "number" && info.downlink > 0 && info.downlink < 2.5) {
    return "slow";
  }
  return "normal";
}

export function isSlowConnectionTier(tier: ConnectionTier): boolean {
  return tier === "slow";
}
