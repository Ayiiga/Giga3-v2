/** GitHub OAuth for *social login* (not OIDC). Subject = numeric user id string. */

type FetchLike = typeof fetch;

export function githubLoginAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    scope: args.scopes.join(" "),
    state: args.state,
    code_challenge: args.codeChallenge,
    code_challenge_method: "S256",
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGithubLoginCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
    codeVerifier: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const res = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: args.clientId,
      client_secret: args.clientSecret,
      code: args.code,
      redirect_uri: args.redirectUri,
      code_verifier: args.codeVerifier,
    }),
  });
  const json = (await res.json()) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `GitHub token exchange failed (${res.status})`
    );
  }
  return json.access_token;
}

export type GithubIdentity = {
  subject: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
};

export async function fetchGithubIdentity(
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<GithubIdentity> {
  const userRes = await fetchImpl("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Giga3-AI",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userRes.ok) {
    throw new Error(`GitHub user lookup failed (${userRes.status})`);
  }
  const user = (await userRes.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };
  if (typeof user.id !== "number" || !Number.isFinite(user.id)) {
    throw new Error("GitHub did not return a stable user id.");
  }

  const emailsRes = await fetchImpl("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Giga3-AI",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!emailsRes.ok) {
    throw new Error(`GitHub email lookup failed (${emailsRes.status})`);
  }
  const emails = (await emailsRes.json()) as Array<{
    email?: string;
    primary?: boolean;
    verified?: boolean;
  }>;
  const verified = emails.filter((e) => e.verified === true && typeof e.email === "string");
  const primary = verified.find((e) => e.primary === true);
  const chosen = primary ?? verified[0];
  const email = chosen?.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("GitHub did not provide a verified email address.");
  }

  return {
    subject: String(user.id),
    email,
    emailVerified: true,
    ...(user.name ? { name: user.name } : user.login ? { name: user.login } : {}),
    ...(user.avatar_url?.startsWith("https://") ? { picture: user.avatar_url } : {}),
  };
}
