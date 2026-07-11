"use client";

import { Button } from "@/components/ui/Button";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { cn } from "@/lib/utils";
import { api } from "convex/_generated/api";
import { useMutation } from "convex/react";
import { HeartHandshake, Loader2 } from "lucide-react";
import { memo, useCallback, useState } from "react";

export const GigaSocialFanButton = memo(function GigaSocialFanButton({
  sessionToken,
  creatorId,
  supporting: initialSupporting,
  disabled,
  className,
  onChange,
}: {
  sessionToken: string;
  creatorId: string;
  supporting?: boolean;
  disabled?: boolean;
  className?: string;
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

  return (
    <Button
      type="button"
      size="sm"
      variant={supporting ? "outline" : "default"}
      disabled={disabled || busy}
      onClick={() => void handleToggle()}
      className={cn("min-h-9", className)}
      aria-pressed={supporting}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <HeartHandshake className="h-4 w-4" aria-hidden />
      )}
      {supporting ? FAN_LABELS.supporting : FAN_LABELS.becomeAFan}
    </Button>
  );
});
