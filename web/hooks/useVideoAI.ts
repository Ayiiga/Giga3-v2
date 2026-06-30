"use client";

import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";

export function useVideoWallet() {
  const [mounted, setMounted] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setSessionToken(getSessionToken());
  }, []);

  const wallet = useQuery(
    api.videoCredits.getVideoWallet,
    mounted && sessionToken ? { sessionToken } : "skip"
  );

  const generate = useAction(api.videoAI.generate);
  const initPayment = useAction(api.paystack.initializePayment);

  const purchaseProduct = useCallback(
    async (productId: string) => {
      const token = getSessionToken();
      if (!token) throw new Error("Sign in required");
      return initPayment({ sessionToken: token, productId });
    },
    [initPayment]
  );

  const generateVideo = useCallback(
    async (args: {
      category: string;
      prompt: string;
      imageUrl?: string;
      aspectRatio?: "16:9" | "9:16";
    }) => {
      const token = getSessionToken();
      if (!token) throw new Error("Sign in required");
      return generate({
        sessionToken: token,
        category: args.category,
        prompt: args.prompt,
        imageUrl: args.imageUrl,
        aspectRatio: args.aspectRatio,
      });
    },
    [generate]
  );

  return {
    mounted,
    sessionToken,
    wallet,
    generateVideo,
    purchaseProduct,
  };
}
