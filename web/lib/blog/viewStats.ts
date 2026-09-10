import { formatCompactCount } from "@/lib/gigasocial/ogMeta";

export function formatBlogViewLabel(count: number): string {
  return `${formatCompactCount(Math.max(0, count))} view${count === 1 ? "" : "s"}`;
}
