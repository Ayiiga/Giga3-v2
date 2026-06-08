"use client";

import { useThemeContext } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { memo } from "react";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = memo(function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolved, toggle } = useThemeContext();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "touch-target inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm",
        "hover:border-accent/30 hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
});
