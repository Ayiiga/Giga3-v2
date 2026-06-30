import { internal } from "./_generated/api";
import type { SecurityEventType } from "./securityMonitoring";

type SecurityCtx = { runMutation: (fn: any, args: any) => Promise<any> };

export async function logSecurityEvent(
  ctx: SecurityCtx,
  args: {
    eventType: SecurityEventType | string;
    severity: "low" | "medium" | "high";
    message: string;
    email?: string;
    metadata?: string;
  }
): Promise<void> {
  await ctx
    .runMutation(internal.securityMonitoring.recordSecurityEvent, {
      eventType: args.eventType,
      severity: args.severity,
      message: args.message,
      email: args.email,
      metadata: args.metadata,
    })
    .catch(() => null);
}
