"use client";

import { generationCoordinator } from "@/lib/generation/coordinator";
import { NotificationService } from "@/lib/intelligentNotifications";
import { useEffect, useRef } from "react";

/**
 * Site-wide host for the local intelligent notification engine.
 * - Records app opens / section views
 * - Evaluates soft reminders when the tab is hidden (no spam while active)
 * - Mirrors AI generation completions into the local inbox
 */
export function IntelligentNotificationHost() {
  const seenComplete = useRef(new Set<string>());

  useEffect(() => {
    NotificationService.recordAppOpen();

    // Soft reminder pass shortly after open, then occasionally while backgrounded.
    const initialTimer = window.setTimeout(() => {
      NotificationService.evaluateReminders();
    }, 45_000);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") {
        NotificationService.evaluateReminders();
      }
    }, 15 * 60_000);

    function onVisibility() {
      if (document.visibilityState === "visible") {
        NotificationService.recordAppOpen();
        NotificationService.clearCategoriesForPath(window.location.pathname);
        void NotificationService.syncBadgeFromLocal();
      } else {
        NotificationService.evaluateReminders();
      }
    }

    function onPathChange() {
      NotificationService.clearCategoriesForPath(window.location.pathname);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("popstate", onPathChange);
    window.addEventListener("giga3:route-change", onPathChange);

    const pushState = history.pushState.bind(history);
    const replaceState = history.replaceState.bind(history);
    history.pushState = function (...args) {
      const result = pushState(...args);
      onPathChange();
      return result;
    };
    history.replaceState = function (...args) {
      const result = replaceState(...args);
      onPathChange();
      return result;
    };

    // Seed path categories once
    onPathChange();

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("popstate", onPathChange);
      window.removeEventListener("giga3:route-change", onPathChange);
      history.pushState = pushState;
      history.replaceState = replaceState;
    };
  }, []);

  useEffect(() => {
    return generationCoordinator.subscribe(() => {
      for (const task of generationCoordinator.getTasks()) {
        if (task.state !== "completed" || !task.completedAt) continue;
        if (seenComplete.current.has(task.id)) continue;
        seenComplete.current.add(task.id);

        NotificationService.recordContentCreate();
        NotificationService.recordCompletedAction("studio:generation-ready");
        NotificationService.notifyLocal({
          category: "studio",
          title: "Your AI creation is ready",
          body: task.label || "Open AI Studio to review your latest generation.",
          href: "/media",
          dedupeKey: `studio:complete:${task.id}`,
          browserNotify: true,
        });
      }
    });
  }, []);

  return null;
}
