import { v } from "convex/values";
import {
  isConfiguredAdminKey,
  verifyAdminSessionToken,
} from "./adminSessionAuth";

/** Shared admin credential args — prefer adminSessionToken over legacy adminKey. */
export const adminCredentialArgs = {
  adminSessionToken: v.optional(v.string()),
  adminKey: v.optional(v.string()),
};

export type AdminCredentialInput = {
  adminSessionToken?: string;
  adminKey?: string;
};

export async function ensureAdminAccess(args: AdminCredentialInput): Promise<void> {
  const sessionToken = args.adminSessionToken?.trim();
  if (sessionToken) {
    const ok = await verifyAdminSessionToken(sessionToken);
    if (!ok) throw new Error("Unauthorized");
    return;
  }

  const adminKey = args.adminKey?.trim();
  if (adminKey && isConfiguredAdminKey(adminKey)) {
    return;
  }

  throw new Error("Unauthorized");
}
