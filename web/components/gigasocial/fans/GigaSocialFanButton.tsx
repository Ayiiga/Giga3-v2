"use client";

import { Button } from "@/components/ui/Button";
import { FAN_LABELS, FOLLOW_LABELS } from "@/lib/gigasocial/fanBranding";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { HeartHandshake, Loader2, UserMinus, UserPlus } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialFanButton = memo(function GigaSocialFanButton({
  sessionToken,
  creatorId,
  supporting: initialSupporting,
  disabled,
  className,
  useFollowLabels = false,
  onChange,
}: {
  sessionToken: string;
  creatorId: string;
  supporting?: boolean;
  disabled?: boolean;
  className?: string;
  useFollowLabels?: boolean;
  onChange?: (supporting: boolean) => void;
}) {
  const [supporting, setSupporting] = useState(Boolean(initialSupporting));
  const [busy, setBusy] = useState(false);
  const toggleFan = useMutation(api.gigaSocial.toggleFan);

  const handleToggle = useCallback(async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await toggleFan({ sessionToken, creatorId });
      setSupporting(result.supporting);
      onChange?.(result.supporting);
    } finally {
      setBusy(false);
    }
  }, [busy, creatorId, disabled, onChange, sessionToken, toggleFan]);

  const label = useFollowLabels
    ? supporting
      ? FOLLOW_LABELS.following
      : FOLLOW_LABELS.follow
    : supporting
      ? FAN_LABELS.supporting
      : FAN_LABELS.becomeAFan;

  const Icon = useFollowLabels
    ? supporting
      ? UserMinus
      : UserPlus
    : HeartHandshake;

  return (
    <Button
      type="button"
      size="sm"
      variant={supporting ? "outline" : "default"}
      disabled={disabled || busy}
      onClick={() => void handleToggle()}
      className={cn("min-h-9", className)}
      aria-pressed={supporting}
      aria-label={supporting ? (useFollowLabels ? FOLLOW_LABELS.unfollow : FAN_LABELS.unfan) : label}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon className="h-4 w-4" aria-hidden />
      )}
      {label}
    </Button>
  );
});
