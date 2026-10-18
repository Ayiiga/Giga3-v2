/** Google OAuth + Drive / Gmail API helpers (server-side only). */

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type GoogleUserInfo = {
  email?: string;
  name?: string;
  sub?: string;
};

type FetchLike = typeof fetch;

export function googleAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge?: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    response_type: "code",
    scope: args.scopes.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state: args.state,
  });
  if (args.codeChallenge) {
    params.set("code_challenge", args.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    codeVerifier?: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    grant_type: "authorization_code",
    redirect_uri: args.redirectUri,
  });
  if (args.codeVerifier) body.set("code_verifier", args.codeVerifier);
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as GoogleTokenResponse & { error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `Google token exchange failed (${res.status})`);
  }
  return json;
}

export async function refreshGoogleToken(
  args: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    refresh_token: args.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as GoogleTokenResponse & { error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `Google token refresh failed (${res.status})`);
  }
  return json;
}

export async function revokeGoogleToken(
  token: string,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  await fetchImpl(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    { method: "POST" }
  );
}

export async function fetchGoogleUserInfo(
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<GoogleUserInfo> {
  const res = await fetchImpl("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as GoogleUserInfo;
}

export async function listDriveFiles(
  accessToken: string,
  args: { query?: string; pageSize?: number } = {},
  fetchImpl: FetchLike = fetch
) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(50, args.pageSize ?? 20)),
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,size),nextPageToken",
    q: args.query?.trim()
      ? `trashed=false and fullText contains '${args.query.replace(/'/g, "\\'")}'`
      : "trashed=false",
  });
  const res = await fetchImpl(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = (await res.json()) as {
    files?: Array<Record<string, unknown>>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `Drive list failed (${res.status})`);
  return json.files ?? [];
}

export async function readDriveFileText(
  accessToken: string,
  fileId: string,
  mimeType: string,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const exportable: Record<string, string> = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
  };
  const exportMime = exportable[mimeType];
  const url = exportMime
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive read failed (${res.status})`);
  return (await res.text()).slice(0, 200_000);
}

export async function createDriveTextFile(
  accessToken: string,
  args: { name: string; content: string },
  fetchImpl: FetchLike = fetch
) {
  const metadata = {
    name: args.name,
    mimeType: "application/vnd.google-apps.document",
  };
  const boundary = "giga3_drive_boundary";
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${args.content}\r\n` +
    `--${boundary}--`;
  const res = await fetchImpl(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Drive create failed (${res.status})`);
  }
  return json;
}

export async function listGmailMessages(
  accessToken: string,
  args: { query?: string; maxResults?: number } = {},
  fetchImpl: FetchLike = fetch
) {
  const params = new URLSearchParams({
    maxResults: String(Math.min(50, args.maxResults ?? 20)),
  });
  if (args.query?.trim()) params.set("q", args.query.trim());
  const res = await fetchImpl(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = (await res.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `Gmail list failed (${res.status})`);
  return json.messages ?? [];
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message || `Gmail read failed (${res.status})`);
  return json;
}

export function extractGmailPlainText(message: Record<string, unknown>): string {
  const payload = message.payload as
    | {
        body?: { data?: string };
        parts?: Array<{ mimeType?: string; body?: { data?: string }; parts?: unknown[] }>;
        headers?: Array<{ name: string; value: string }>;
      }
    | undefined;
  const headers = payload?.headers ?? [];
  const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value ?? "";
  const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
  const decode = (data?: string) => {
    if (!data) return "";
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    try {
      return atob(b64);
    } catch {
      return "";
    }
  };
  let body = decode(payload?.body?.data);
  if (!body && payload?.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain") {
        body = decode(part.body?.data);
        break;
      }
    }
  }
  return `From: ${from}\nSubject: ${subject}\n\n${body}`.slice(0, 50_000);
}

function toBase64Url(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function createGmailDraft(
  accessToken: string,
  args: { to: string; subject: string; body: string },
  fetchImpl: FetchLike = fetch
) {
  const raw =
    `To: ${args.to}\r\nSubject: ${args.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${args.body}`;
  const res = await fetchImpl(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw: toBase64Url(raw) } }),
    }
  );
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Gmail draft failed (${res.status})`);
  }
  return json;
}

export async function sendGmailMessage(
  accessToken: string,
  args: { to: string; subject: string; body: string },
  fetchImpl: FetchLike = fetch
) {
  const raw =
    `To: ${args.to}\r\nSubject: ${args.subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${args.body}`;
  const res = await fetchImpl(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(raw) }),
    }
  );
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message || `Gmail send failed (${res.status})`);
  }
  return json;
}
