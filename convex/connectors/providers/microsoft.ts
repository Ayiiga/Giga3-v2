/** Microsoft identity + Graph calendar helpers (connector OAuth — not social login). */

import { resolveMicrosoftConnectorTenant } from "../oauthErrors";

export type MsTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type FetchLike = typeof fetch;

function tenantPath(envTenant?: string): string {
  return resolveMicrosoftConnectorTenant(envTenant).tenant;
}

export function microsoftAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  tenantId?: string;
}): string {
  const authority = resolveMicrosoftConnectorTenant(args.tenantId);
  const params = new URLSearchParams({
    client_id: args.clientId.trim(),
    response_type: "code",
    redirect_uri: args.redirectUri,
    response_mode: "query",
    scope: args.scopes.join(" "),
    state: args.state,
    // Helps users pick the intended work or personal account.
    prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${authority.tenant}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    scopes: string[];
    tenantId?: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<MsTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
    scope: args.scopes.join(" "),
  });
  const res = await fetchImpl(
    `https://login.microsoftonline.com/${tenantPath(args.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = (await res.json()) as MsTokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `Microsoft token exchange failed (${res.status})`
    );
  }
  return json;
}

export async function refreshMicrosoftToken(
  args: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    scopes: string[];
    tenantId?: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<MsTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
    scope: args.scopes.join(" "),
  });
  const res = await fetchImpl(
    `https://login.microsoftonline.com/${tenantPath(args.tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = (await res.json()) as MsTokenResponse & { error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || `Microsoft token refresh failed (${res.status})`);
  }
  return json;
}

export async function fetchMsProfile(
  accessToken: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as { mail?: string; userPrincipalName?: string; displayName?: string };
}

export async function listCalendarEvents(
  accessToken: string,
  args: { top?: number; search?: string } = {},
  fetchImpl: FetchLike = fetch
) {
  const params = new URLSearchParams({
    $top: String(Math.min(50, args.top ?? 20)),
    $orderby: "start/dateTime",
    $select: "id,subject,start,end,isAllDay,webLink,organizer",
  });
  if (args.search?.trim()) params.set("$search", `"${args.search.trim()}"`);
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/me/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );
  const json = (await res.json()) as {
    value?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `Calendar list failed (${res.status})`);
  return json.value ?? [];
}

export async function createCalendarEvent(
  accessToken: string,
  args: {
    subject: string;
    startIso: string;
    endIso: string;
    timeZone?: string;
    body?: string;
  },
  fetchImpl: FetchLike = fetch
) {
  const tz = args.timeZone || "UTC";
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: args.subject,
      body: { contentType: "Text", content: args.body ?? "" },
      start: { dateTime: args.startIso, timeZone: tz },
      end: { dateTime: args.endIso, timeZone: tz },
    }),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Create event failed (${res.status})`);
  }
  return json;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  patch: Record<string, unknown>,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    const json = (await res.json()) as { error?: { message?: string } };
    throw new Error(json.error?.message || `Update event failed (${res.status})`);
  }
  return await res.json();
}

export async function cancelCalendarEvent(
  accessToken: string,
  eventId: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`Cancel event failed (${res.status})`);
  }
}

export async function getScheduleAvailability(
  accessToken: string,
  args: { startIso: string; endIso: string; timeZone?: string },
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://graph.microsoft.com/v1.0/me/calendar/getSchedule", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: `outlook.timezone="${args.timeZone || "UTC"}"`,
    },
    body: JSON.stringify({
      schedules: ["me"],
      startTime: { dateTime: args.startIso, timeZone: args.timeZone || "UTC" },
      endTime: { dateTime: args.endIso, timeZone: args.timeZone || "UTC" },
      availabilityViewInterval: 30,
    }),
  });
  const json = (await res.json()) as {
    value?: unknown[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `Availability lookup failed (${res.status})`);
  }
  return json.value ?? [];
}
