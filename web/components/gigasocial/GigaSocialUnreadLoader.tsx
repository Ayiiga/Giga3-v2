"use client";

import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Component, useEffect, type ReactNode } from "react";

class GigaSocialUnreadQueryBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[GigaSocialUnreadLoader]", error);
    this.props.onFallback();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function GigaSocialUnreadQuery({
  sessionToken,
  onUnread,
}: {
  sessionToken: string;
  onUnread: (count: number) => void;
}) {
  const data = useQuery(api.gigaSocial.getNotificationUnreadCount, { sessionToken });

  useEffect(() => {
    onUnread(data?.unreadCount ?? 0);
  }, [data?.unreadCount, onUnread]);

  return null;
}

/** Loads notification badge count without crashing the GigaSocial shell. */
export function GigaSocialUnreadLoader({
  sessionToken,
  onUnread,
}: {
  sessionToken: string;
  onUnread: (count: number) => void;
}) {
  return (
    <GigaSocialUnreadQueryBoundary onFallback={() => onUnread(0)}>
      <GigaSocialUnreadQuery sessionToken={sessionToken} onUnread={onUnread} />
    </GigaSocialUnreadQueryBoundary>
  );
}
