import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { frontendBaseUrl } from "./registry";

/** GET callback (Microsoft, GitHub). */
export const socialOAuthCallbackGet = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return Response.redirect(
      `${frontendBaseUrl()}/chat/login/?auth_error=${encodeURIComponent(error)}`,
      302
    );
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return Response.redirect(
      `${frontendBaseUrl()}/chat/login/?auth_error=missing_code`,
      302
    );
  }
  const result = await ctx.runAction(internal.socialAuth.oauth.completeSocialOAuthInternal, {
    code,
    state,
  });
  return Response.redirect(result.redirectUrl, 302);
});

/** POST callback (Apple form_post). */
export const socialOAuthCallbackPost = httpAction(async (ctx, request) => {
  const contentType = request.headers.get("content-type") || "";
  let code: string | null = null;
  let state: string | null = null;
  let error: string | null = null;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    code = params.get("code");
    state = params.get("state");
    error = params.get("error");
  } else {
    const url = new URL(request.url);
    code = url.searchParams.get("code");
    state = url.searchParams.get("state");
    error = url.searchParams.get("error");
  }
  if (error) {
    return Response.redirect(
      `${frontendBaseUrl()}/chat/login/?auth_error=${encodeURIComponent(error)}`,
      302
    );
  }
  if (!code || !state) {
    return Response.redirect(
      `${frontendBaseUrl()}/chat/login/?auth_error=missing_code`,
      302
    );
  }
  const result = await ctx.runAction(internal.socialAuth.oauth.completeSocialOAuthInternal, {
    code,
    state,
  });
  return Response.redirect(result.redirectUrl, 302);
});
