import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getFrontendBaseUrl } from "./emailClient";

function htmlPage(title: string, body: string): Response {
  const frontend = getFrontendBaseUrl();
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · Giga3 AI</title>
<style>
  body{margin:0;font-family:Georgia,serif;background:#f4f7f6;color:#134e4a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;}
  .card{max-width:420px;background:#fff;border:1px solid #d1e5e1;border-radius:16px;padding:28px;text-align:center;}
  a{color:#0f766e;}
</style></head>
<body><div class="card"><h1 style="margin:0 0 12px;font-size:22px;">${title}</h1>
<p style="margin:0 0 18px;line-height:1.5;">${body}</p>
<p style="margin:0;"><a href="${frontend}/">Back to Giga3</a></p>
</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/** GET /email/unsubscribe?email=&token= — one-click opt-out for engagement mail. */
export const unsubscribeEngagementEmail = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const token = (url.searchParams.get("token") || "").trim();

  if (!email || !token) {
    return htmlPage(
      "Unsubscribe link incomplete",
      "Open the unsubscribe link from your email, or manage preferences after signing in."
    );
  }

  const result = await ctx.runMutation(
    internal.engagementEmail.unsubscribeByTokenInternal,
    { email, token }
  );

  if (result.ok) {
    return htmlPage(
      "You are unsubscribed",
      "You will no longer receive occasional Giga3 update emails. Password reset and important account messages may still be sent."
    );
  }

  return htmlPage(
    "Could not unsubscribe",
    "This link may already have been used or is invalid. Sign in to Giga3 and update your email preferences if needed."
  );
});
