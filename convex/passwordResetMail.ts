/**
 * Password-reset email planning.
 *
 * The recipient is always the account's registered email. The owner inbox may
 * receive an operational failure notice, and that notice never contains the
 * reset URL or token.
 */

import { passwordRequirementsHint } from "./passwordCrypto";
import { getEmailFallbackInbox, wrapEmailHtml, type SendEmailInput } from "./emailClient";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Normalize the only address a reset link may be sent to. */
export function assertPasswordResetRecipient(registeredEmail: string): string {
  const to = registeredEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error("Invalid password reset recipient");
  }
  return to;
}

function resetEmailHtml(resetUrl: string): string {
  return wrapEmailHtml({
    title: "Reset your password",
    bodyHtml: `
      <p style="margin:0 0 14px;">We received a request to reset your Giga3 AI password.</p>
      <p style="margin:0 0 22px;">This link expires in <strong>1 hour</strong>.</p>
      <p style="margin:0 0 22px;">
        <a href="${resetUrl}"
           style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;">
          Reset password
        </a>
      </p>
      <p style="margin:0;font-size:14px;color:#5f7a76;">If the button does not work, copy and paste this link into your browser:</p>
      <p style="margin:8px 0 0;word-break:break-all;font-size:13px;"><a href="${resetUrl}" style="color:#0f766e;">${resetUrl}</a></p>
      <p style="margin:18px 0 0;font-size:14px;">If you did not request this, you can ignore this email — your password will stay the same.</p>
    `,
    footerHtml: `<p style="margin:0;">${passwordRequirementsHint()}</p>`,
  });
}

/** Message whose `to` is the registered user. The reset URL is only placed here. */
export function buildPasswordResetMessage(
  registeredEmail: string,
  resetUrl: string
): SendEmailInput {
  const to = assertPasswordResetRecipient(registeredEmail);
  return {
    to,
    subject: "Reset your Giga3 AI password",
    html: resetEmailHtml(resetUrl),
    text: `Reset your Giga3 AI password (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
    tags: [
      { name: "category", value: "password_reset" },
      { name: "app", value: "giga3" },
    ],
  };
}

/**
 * Operational alert when Resend rejects delivery. Does not accept a reset URL.
 * Returns null when there is no distinct ops inbox.
 */
export function buildResetOpsFailureNotice(
  registeredEmail: string,
  reason: string
): SendEmailInput | null {
  const to = getEmailFallbackInbox();
  const recipient = assertPasswordResetRecipient(registeredEmail);
  if (!to || to === recipient) return null;
  const safeReason = reason.replace(/https?:\/\/\S+/gi, "[removed]").slice(0, 80);
  const text = `Password reset delivery to ${recipient} failed (${safeReason}). This notice does not include a reset link. The user must request a new reset after email delivery is fixed.`;
  return {
    to,
    subject: "[Giga3] Password reset email was not delivered",
    text,
    html: wrapEmailHtml({
      title: "Password reset was not delivered",
      bodyHtml: `<p style="margin:0 0 12px;">Delivery to <strong>${escapeHtml(recipient)}</strong> failed (${escapeHtml(safeReason)}).</p><p style="margin:0;">This notice does not include a reset link.</p>`,
    }),
    tags: [
      { name: "category", value: "password_reset_delivery_failure" },
      { name: "app", value: "giga3" },
    ],
  };
}

/** Identical public payload for known and unknown emails. */
export function publicPasswordResetResponse(deliveryConfigured: boolean) {
  return {
    ok: true as const,
    emailed: deliveryConfigured,
    deliveryConfigured,
    accountMatched: true as const,
  };
}
