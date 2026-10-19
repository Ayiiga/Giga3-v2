import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { frontendBaseUrl } from "./registry";

/** OAuth redirect target for all external connectors (not social login). */
export const oauthCallback = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    const params = new URLSearchParams({
      tab: "integrations",
      connector_error: error.slice(0, 64),
    });
    // Short provider description helps map Google verification / MS consumer errors in the UI.
    if (errorDescription) {
      params.set("connector_error_detail", errorDescription.slice(0, 240));
    }
    return Response.redirect(
      `${frontendBaseUrl()}/automation/?${params.toString()}`,
      302
    );
  }

  if (!code || !state) {
    return Response.redirect(
      `${frontendBaseUrl()}/automation/?tab=integrations&connector_error=missing_code`,
      302
    );
  }

  const result = await ctx.runAction(internal.connectors.oauth.completeOAuthInternal, {
    code,
    state,
  });

  return Response.redirect(result.redirectUrl, 302);
});
