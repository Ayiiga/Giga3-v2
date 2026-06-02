"use client";

import { Button } from "@/components/ui/Button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";

interface InstallButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "outline";
}

export function InstallButton({
  className,
  size = "md",
  variant = "outline",
}: InstallButtonProps) {
  const { install, canInstall, isInstalled, isIOS } = usePwaInstall();

  if (isInstalled) {
    return (
      <span className={cn("text-xs text-muted", className)} aria-live="polite">
        App installed
      </span>
    );
  }

  if (isIOS) {
    return (
      <span className={cn("max-w-[200px] text-xs text-muted", className)}>
        Install via Share → Add to Home Screen
      </span>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => void install()}
      aria-label="Install Giga3 AI app"
    >
      <Download className="h-4 w-4" aria-hidden />
      Install app
    </Button>
  );
}
