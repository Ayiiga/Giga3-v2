"use client";

import { NewsDeskPanel } from "@/components/news/NewsDeskPanel";

export function CreatorNewsHub({ sessionToken }: { sessionToken: string }) {
  return <NewsDeskPanel sessionToken={sessionToken} variant="marketplace" />;
}
