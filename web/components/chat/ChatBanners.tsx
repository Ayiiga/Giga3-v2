"use client";

import { CreditPromptBanner } from "@/components/billing/CreditPromptBanner";
import { ChatProviderBanner } from "@/components/chat/ChatProviderBanner";
import { UserLearningBanner } from "@/components/chat/UserLearningBanner";
import { creditBalancePrompt } from "@/lib/billing/creditPrompts";
import { useRenderDiagnostic } from "@/hooks/useRenderDiagnostic";
import { cn } from "@/lib/utils";
import { memo, useEffect, useState } from "react";

const LOW_CREDIT_DISMISS_KEY = "giga3_low_credit_dismissed_at";

interface ChatBannersProps {
  email: string;
  mounted: boolean;
  hasMessages?: boolean;
  chatProviderLabel: string | null;
  usedFallback: boolean;
  interestProfileJson: string | null;
  credits?: number | null;
  subscriptionActive?: boolean;
}

function bannersPropsEqual(prev: ChatBannersProps, next: ChatBannersProps): boolean {
  return (
    prev.email === next.email &&
    prev.mounted === next.mounted &&
    prev.hasMessages === next.hasMessages &&
    prev.chatProviderLabel === next.chatProviderLabel &&
    prev.usedFallback === next.usedFallback &&
    prev.interestProfileJson === next.interestProfileJson &&
    prev.credits === next.credits &&
    prev.subscriptionActive === next.subscriptionActive
  );
}

function readLowCreditDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(LOW_CREDIT_DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < 6 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Banners are pure; platform hooks own data subscriptions. */
export const ChatBanners = memo(function ChatBanners({
  hasMessages = false,
  chatProviderLabel,
  usedFallback,
  interestProfileJson,
  credits = null,
  subscriptionActive = false,
}: ChatBannersProps) {
  useRenderDiagnostic("ChatBanners");

  const balancePrompt = creditBalancePrompt(credits);
  const [lowCreditDismissed, setLowCreditDismissed] = useState(false);

  useEffect(() => {
    setLowCreditDismissed(readLowCreditDismissed());
  }, []);

  const showBalancePrompt =
    balancePrompt === "empty" ||
    (balancePrompt === "low" && !lowCreditDismissed);

  function dismissLowCredit() {
    try {
      sessionStorage.setItem(LOW_CREDIT_DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setLowCreditDismissed(true);
  }

  return (
    <div className="shrink-0">
      {showBalancePrompt && balancePrompt && (
        <div className="border-b border-amber-200/50 px-3 py-2 sm:px-4">
          <CreditPromptBanner
            variant={balancePrompt}
            credits={credits}
            subscriptionActive={subscriptionActive}
            onDismiss={balancePrompt === "low" ? dismissLowCredit : undefined}
          />
        </div>
      )}
      <div className={cn(hasMessages && "hidden sm:block")}>
        <UserLearningBanner interestProfileJson={interestProfileJson} />
      </div>
      <ChatProviderBanner label={chatProviderLabel} usedFallback={usedFallback} />
    </div>
  );
}, bannersPropsEqual);
