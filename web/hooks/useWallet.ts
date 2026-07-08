"use client";

import { getSessionToken } from "@/lib/auth";
import type { WalletDashboard, WalletTransaction, ClientPaymentView } from "@/lib/wallet/types";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export function useWallet() {
  const [mounted, setMounted] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  const dashboard = useQuery(
    api.gigaWallet.getDashboard,
    mounted && sessionToken ? { sessionToken } : "skip"
  ) as WalletDashboard | null | undefined;

  const payments = useQuery(
    api.gigaWallet.listMyPayments,
    mounted && sessionToken ? { sessionToken, limit: 40 } : "skip"
  ) as ClientPaymentView[] | undefined;

  const transactions = useQuery(
    api.gigaWallet.listWalletTransactions,
    mounted && sessionToken ? { sessionToken, limit: 60 } : "skip"
  ) as WalletTransaction[] | undefined;

  const creditLogs = useQuery(
    api.credits.listCreditLogs,
    mounted && sessionToken ? { sessionToken, limit: 40 } : "skip"
  );

  const videoCreditLogs = useQuery(
    api.gigaWallet.listVideoCreditLogs,
    mounted && sessionToken ? { sessionToken, limit: 40 } : "skip"
  );

  const creatorRevenue = useQuery(
    api.marketplace.getCreatorRevenue,
    mounted && sessionToken ? { sessionToken } : "skip"
  );

  const loading =
    !mounted ||
    !sessionToken ||
    dashboard === undefined ||
    payments === undefined ||
    transactions === undefined;

  return {
    sessionToken,
    mounted,
    dashboard,
    payments,
    transactions,
    creditLogs,
    videoCreditLogs,
    creatorRevenue,
    loading,
  };
}
