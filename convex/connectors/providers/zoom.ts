/** Zoom OAuth + Meetings API helpers. */

export type ZoomTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

type FetchLike = typeof fetch;

export function zoomAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    state: args.state,
  });
  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

export async function exchangeZoomCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<ZoomTokenResponse> {
  const basic = btoa(`${args.clientId}:${args.clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
  });
  const res = await fetchImpl("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as ZoomTokenResponse & { reason?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.reason || json.error || `Zoom token exchange failed (${res.status})`);
  }
  return json;
}

export async function refreshZoomToken(
  args: { clientId: string; clientSecret: string; refreshToken: string },
  fetchImpl: FetchLike = fetch
): Promise<ZoomTokenResponse> {
  const basic = btoa(`${args.clientId}:${args.clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
  });
  const res = await fetchImpl("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as ZoomTokenResponse & { reason?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.reason || `Zoom token refresh failed (${res.status})`);
  }
  return json;
}

export async function fetchZoomUser(
  accessToken: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as { email?: string; display_name?: string; id?: string };
}

export async function listZoomMeetings(
  accessToken: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://api.zoom.us/v2/users/me/meetings?type=scheduled&page_size=30", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as {
    meetings?: Array<Record<string, unknown>>;
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `Zoom list meetings failed (${res.status})`);
  return json.meetings ?? [];
}

export async function createZoomMeeting(
  accessToken: string,
  args: { topic: string; startTimeIso?: string; durationMinutes?: number },
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: args.topic,
      type: args.startTimeIso ? 2 : 1,
      start_time: args.startTimeIso,
      duration: args.durationMinutes ?? 30,
      timezone: "UTC",
    }),
  });
  const json = (await res.json()) as {
    id?: number;
    join_url?: string;
    message?: string;
  };
  if (!res.ok || !json.join_url) {
    throw new Error(json.message || `Zoom create meeting failed (${res.status})`);
  }
  return json;
}
