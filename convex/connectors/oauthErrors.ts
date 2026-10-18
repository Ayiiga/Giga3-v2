/**
 * Map provider OAuth callback / exchange errors to safe UI copy.
 * Never echo tokens, secrets, or raw stack traces.
 */

export function mapConnectorOAuthError(
  error: string | null | undefined,
  errorDescription?: string | null
): string {
  const code = (error || "").trim().toLowerCase();
  const desc = (errorDescription || "").trim().toLowerCase();

  if (!code && !desc) {
    return "Connection failed. Try again.";
  }

  if (
    code === "unauthorized_client" ||
    desc.includes("not enabled for consumers") ||
    desc.includes("client does not exist")
  ) {
    return (
      "Microsoft rejected this app for the account type you chose. In Entra ID, set " +
      "Supported account types to “Accounts in any organizational directory and personal Microsoft accounts”, " +
      "leave MICROSOFT_CONNECTOR_TENANT unset (uses /common), and confirm the Web redirect URI is " +
      "https://perfect-lark-521.convex.site/connectors/oauth/callback."
    );
  }

  if (code === "access_denied" || desc.includes("access_denied")) {
    if (
      desc.includes("verification") ||
      desc.includes("has not completed") ||
      desc.includes("currently being tested") ||
      desc.includes("test user")
    ) {
      return (
        "Google blocked this connect because the Drive/Gmail OAuth app is still in Testing mode " +
        "(or the account is not on the test-user list). In Google Cloud Console → OAuth consent screen, " +
        "add this Google account as a test user, or complete verification before publishing. " +
        "This is separate from Giga3 Google sign-in."
      );
    }
    return "You declined permission or the provider denied access. Try Connect again and approve the requested access.";
  }

  if (code === "invalid_client" || desc.includes("invalid_client")) {
    return (
      "Provider rejected the connector client credentials. Check the *_CONNECTOR_CLIENT_ID / " +
      "*_CONNECTOR_CLIENT_SECRET values on Convex (not social-login AUTH_* keys)."
    );
  }

  if (code === "invalid_grant" || desc.includes("invalid_grant")) {
    return "The authorization code expired or was already used. Click Connect and try again.";
  }

  if (code === "invalid_scope" || desc.includes("invalid_scope")) {
    return "The provider rejected the requested permissions. An admin may need to update API permissions / consent.";
  }

  if (code === "consent_required" || desc.includes("consent_required")) {
    return "Additional consent is required. Click Connect and approve access when prompted.";
  }

  if (code === "invalid_state" || code === "missing_code") {
    return "This sign-in link expired or was incomplete. Click Connect and try again.";
  }

  if (code === "oauth_failed") {
    return "Could not finish connecting. Confirm the redirect URI and connector secrets, then retry.";
  }

  // Unknown provider codes — keep short; never surface long descriptions that may leak internals.
  if (code && /^[a-z0-9_.-]{1,64}$/.test(code)) {
    return `Connection issue (${code}). Check provider console settings and try again.`;
  }
  return "Connection failed. Try again.";
}

/** Non-secret Microsoft authority used for authorize/token URLs. */
export type MicrosoftAuthorityKind =
  | "common"
  | "organizations"
  | "consumers"
  | "tenant";

/**
 * Resolve MICROSOFT_CONNECTOR_TENANT for Outlook connector.
 * Default `common` supports work/school + personal Microsoft accounts.
 * `organizations` excludes personal accounts and causes unauthorized_client for consumers.
 */
export function resolveMicrosoftConnectorTenant(
  raw: string | undefined | null
): { tenant: string; kind: MicrosoftAuthorityKind; warnsPersonalAccounts: boolean } {
  const value = (raw || "").trim();
  if (!value || value.toLowerCase() === "common") {
    return { tenant: "common", kind: "common", warnsPersonalAccounts: false };
  }
  const lower = value.toLowerCase();
  if (lower === "organizations") {
    return { tenant: "organizations", kind: "organizations", warnsPersonalAccounts: true };
  }
  if (lower === "consumers") {
    return { tenant: "consumers", kind: "consumers", warnsPersonalAccounts: false };
  }
  // GUID or domain → tenant-specific (personal MSA usually fails).
  return { tenant: value, kind: "tenant", warnsPersonalAccounts: true };
}
