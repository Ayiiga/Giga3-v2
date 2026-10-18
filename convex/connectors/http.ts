import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { frontendBaseUrl } from "./registry";

/** OAuth redirect target for all external connectors. */
export const oauthCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    const dest = `${frontendBaseUrl()}/automation/?tab=integrations&connector_error=${encodeURIComponent(error)}`;
    return Response.redirect(dest, 302);
  }

  if (!code || !state) {
    const dest = `${frontendBaseUrl()}/automation/?tab=integrations&connector_error=missing_code`;
    return Response.redirect(dest, 302);
  }

  const result = await ctx.runAction(internal.connectors.oauth.completeOAuthInternal, {
    code,
    state,
  });

  return Response.redirect(result.redirectUrl, 302);
});
