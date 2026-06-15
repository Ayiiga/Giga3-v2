export type UploadPlanId = "free" | "basic" | "pro" | "premium";

export interface UploadLimitConfig {
  planId: UploadPlanId;
  label: string;
  filesPerDay: number;
  imagesPerDay: number;
  maxFileBytes: number;
}

export interface UploadUsageSnapshot {
  dateKey: string;
  planId: UploadPlanId;
  planLabel: string;
  filesUsed: number;
  imagesUsed: number;
  bytesUsed: number;
  filesRemaining: number;
  imagesRemaining: number;
  limits: UploadLimitConfig;
}

export const DEFAULT_UPLOAD_LIMITS: Record<UploadPlanId, UploadLimitConfig> = {
  free: {
    planId: "free",
    label: "Free",
    filesPerDay: 10,
    imagesPerDay: 5,
    maxFileBytes: 10 * 1024 * 1024,
  },
  basic: {
    planId: "basic",
    label: "Starter",
    filesPerDay: 50,
    imagesPerDay: 20,
    maxFileBytes: 50 * 1024 * 1024,
  },
  pro: {
    planId: "pro",
    label: "Pro",
    filesPerDay: 100,
    imagesPerDay: 40,
    maxFileBytes: 100 * 1024 * 1024,
  },
  premium: {
    planId: "premium",
    label: "Premium",
    filesPerDay: 500,
    imagesPerDay: 200,
    maxFileBytes: 500 * 1024 * 1024,
  },
};

export function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
