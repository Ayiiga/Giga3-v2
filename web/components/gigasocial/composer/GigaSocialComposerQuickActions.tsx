"use client";

import { cn } from "@/lib/utils";
import {
  Camera,
  ImageIcon,
  MapPin,
  Smile,
  Sparkles,
  Video,
} from "lucide-react";
import { memo } from "react";

export type ComposerQuickActionId =
  | "photo"
  | "video"
  | "camera"
  | "feeling"
  | "location"
  | "ai";

const ACTIONS: {
  id: ComposerQuickActionId;
  label: string;
  icon: typeof ImageIcon;
}[] = [
  { id: "photo", label: "Photo", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "camera", label: "Camera", icon: Camera },
  { id: "feeling", label: "Feeling", icon: Smile },
  { id: "location", label: "Location", icon: MapPin },
  { id: "ai", label: "AI Assist", icon: Sparkles },
];

export const GigaSocialComposerQuickActions = memo(
  function GigaSocialComposerQuickActions({
    disabled,
    onAction,
    className,
  }: {
    disabled?: boolean;
    onAction: (id: ComposerQuickActionId) => void;
    className?: string;
  }) {
    return (
      <div
        className={cn("gigasocial-quick-actions", className)}
        role="toolbar"
        aria-label="Composer quick actions"
      >
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className="gigasocial-quick-action inline-flex items-center gap-1.5"
              disabled={disabled}
              onClick={() => onAction(action.id)}
              aria-label={action.label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {action.label}
            </button>
          );
        })}
      </div>
    );
  }
);
