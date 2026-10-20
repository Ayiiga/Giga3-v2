/** Notion OAuth + API helpers. */

export type NotionTokenResponse = {
  access_token: string;
  refresh_token?: string;
  workspace_name?: string;
  workspace_id?: string;
  bot_id?: string;
  duplicated_template_id?: string | null;
};

type FetchLike = typeof fetch;

export function notionAuthUrl(args: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: args.clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: args.redirectUri,
    state: args.state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(
  args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  },
  fetchImpl: FetchLike = fetch
): Promise<NotionTokenResponse> {
  const basic = btoa(`${args.clientId}:${args.clientSecret}`);
  const res = await fetchImpl("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: args.redirectUri,
    }),
  });
  const json = (await res.json()) as NotionTokenResponse & { error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error || `Notion token exchange failed (${res.status})`);
  }
  return json;
}

const NOTION_VERSION = "2022-06-28";

export async function notionSearch(
  accessToken: string,
  query: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: query.trim() || undefined,
      page_size: 20,
      filter: { property: "object", value: "page" },
    }),
  });
  const json = (await res.json()) as {
    results?: Array<Record<string, unknown>>;
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `Notion search failed (${res.status})`);
  return json.results ?? [];
}

export async function notionReadPageBlocks(
  accessToken: string,
  pageId: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl(
    `https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children?page_size=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": NOTION_VERSION,
      },
    }
  );
  const json = (await res.json()) as {
    results?: Array<Record<string, unknown>>;
    message?: string;
  };
  if (!res.ok) throw new Error(json.message || `Notion read failed (${res.status})`);
  return json.results ?? [];
}

export async function notionCreatePage(
  accessToken: string,
  args: { parentPageId: string; title: string; content?: string },
  fetchImpl: FetchLike = fetch
) {
  const children = args.content
    ? [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: args.content.slice(0, 2000) } }],
          },
        },
      ]
    : [];
  const res = await fetchImpl("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { page_id: args.parentPageId },
      properties: {
        title: {
          title: [{ type: "text", text: { content: args.title.slice(0, 200) } }],
        },
      },
      children,
    }),
  });
  const json = (await res.json()) as { id?: string; message?: string; url?: string };
  if (!res.ok || !json.id) {
    throw new Error(json.message || `Notion create page failed (${res.status})`);
  }
  return json;
}

export async function notionAppendBlocks(
  accessToken: string,
  pageId: string,
  content: string,
  fetchImpl: FetchLike = fetch
) {
  const res = await fetchImpl(
    `https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
            },
          },
        ],
      }),
    }
  );
  const json = (await res.json()) as { results?: unknown[]; message?: string };
  if (!res.ok) throw new Error(json.message || `Notion append failed (${res.status})`);
  return json;
}
