"use client";

import {
  connectionTierFromInfo,
  isSlowConnectionTier,
  readConnectionInfo,
  type ConnectionTier,
} from "@/lib/network/connectionQuality";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useEffect, useState } from "react";

export function useConnectionQuality() {
  const online = useOnlineStatus();
  const [tier, setTier] = useState<ConnectionTier>("normal");
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const update = () => {
      const info = readConnectionInfo();
      setSaveData(Boolean(info.saveData));
      setTier(connectionTierFromInfo(online, info));
    };
    update();

    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener?.("change", update);
    return () => conn?.removeEventListener?.("change", update);
  }, [online]);

  return {
    online,
    tier,
    saveData,
    isSlowNetwork: isSlowConnectionTier(tier),
  };
}
