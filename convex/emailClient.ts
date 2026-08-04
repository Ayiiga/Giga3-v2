/**
 * Shared Resend email helper for transactional + engagement mail.
 * Requires Convex env RESEND_API_KEY. Optional AUTH_FROM_EMAIL.
 *
 * Note: Resend's onboarding@resend.dev sender can only deliver to the Resend
 * account owner's inbox until giga3ai.com is verified at resend.com/domains.
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type EmailFailureReason =
  | "not_configured"
  | "sandbox_recipient"
  | "domain_unverified"
  | "provider_error"
  | "network_error";

export type SendEmailResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      reason: EmailFailureReason;
      status?: number;
      providerMessage?: string;
    };

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getAuthFromEmail(): string {
  return (
    process.env.AUTH_FROM_EMAIL?.trim() ||
    // Resend onboarding sender works before a custom domain is verified.
    "Giga3 AI <onboarding@resend.dev>"
  );
}

/** Inbox that receives reset-link copies when Resend cannot deliver to the user. */
export function getEmailFallbackInbox(): string | null {
  const configured = process.env.AUTH_EMAIL_FALLBACK_INBOX?.trim().toLowerCase();
  if (configured && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
    return configured;
  }
  // Resend account owner — only address that works with onboarding@resend.dev.
  return "ayiiga3@gmail.com";
}

export function getFrontendBaseUrl(): string {
  return (
    process.env.FRONTEND_URL?.replace(/\/$/, "") ||
    "https://www.giga3ai.com"
  );
}

/** HTTP actions host (unsubscribe links). */
export function getConvexSiteUrl(): string {
  return (
    process.env.CONVEX_SITE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.replace(/\/$/, "") ||
    "https://perfect-lark-521.convex.site"
  );
}

export function classifyResendFailure(
  status: number,
  body: string
): Pick<Extract<SendEmailResult, { ok: false }>, "reason" | "providerMessage"> {
  const lower = body.toLowerCase();
  if (
    lower.includes("only send testing emails") ||
    lower.includes("your own email address")
  ) {
    return { reason: "sandbox_recipient", providerMessage: body.slice(0, 400) };
  }
  if (
    lower.includes("domain is not verified") ||
    lower.includes("verify a domain") ||
    lower.includes("verify your domain")
  ) {
    return { reason: "domain_unverified", providerMessage: body.slice(0, 400) };
  }
  return {
    reason: "provider_error",
    providerMessage: body.slice(0, 400) || `HTTP ${status}`,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not configured on Convex");
    return { ok: false, reason: "not_configured" };
  }

  const from = getAuthFromEmail();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        tags: input.tags,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const classified = classifyResendFailure(res.status, body);
      console.error(
        `[email] Resend failed status=${res.status} reason=${classified.reason} to=${input.to} body=${body.slice(0, 400)}`
      );
      return {
        ok: false,
        reason: classified.reason,
        status: res.status,
        providerMessage: classified.providerMessage,
      };
    }

    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (error) {
    console.error("[email] Resend request threw", error);
    return { ok: false, reason: "network_error" };
  }
}

export function wrapEmailHtml(opts: {
  title: string;
  bodyHtml: string;
  footerHtml?: string;
}): string {
  const frontend = getFrontendBaseUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Georgia,'Iowan Old Style',serif;color:#134e4a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d1e5e1;">
        <tr><td style="background:linear-gradient(135deg,#0f766e,#042f2e);padding:28px 24px;color:#ecfdf5;">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#99f6e4;">Giga3 AI</div>
          <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;color:#ffffff;">${opts.title}</h1>
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:16px;line-height:1.6;">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="padding:0 24px 28px;font-size:13px;line-height:1.5;color:#5f7a76;">
          ${opts.footerHtml ?? ""}
          <p style="margin:16px 0 0;"><a href="${frontend}" style="color:#0f766e;">Open Giga3 AI</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
