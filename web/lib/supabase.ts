import type { Database } from "@/types/supabase";

type TableName = keyof Database["public"]["Tables"];
type TableRow<T extends TableName> = Database["public"]["Tables"][T]["Row"];
type TableInsert<T extends TableName> = Database["public"]["Tables"][T]["Insert"];
type TableUpdate<T extends TableName> = Database["public"]["Tables"][T]["Update"];
export type SupabaseStorageBucket = "images" | "videos" | "avatars" | "uploads";

export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "SupabaseRequestError";
  }
}

export type SupabaseRestClient = NonNullable<ReturnType<typeof createSupabaseRestClient>>;

const ACCESS_TOKEN_KEY = "giga3_supabase_access_token";

function getSupabaseUrl(): string | null {
  const raw = sanitizeUrlString(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname;
    if (
      !host.endsWith(".supabase.co") &&
      host !== "localhost" &&
      host !== "127.0.0.1"
    ) {
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function getSupabaseAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      typeof data?.message === "string"
        ? data.message
        : typeof data?.error_description === "string"
          ? data.error_description
          : "Supabase request failed";
    throw new SupabaseRequestError(message, res.status, data);
  }
  return data as T;
}

export function createSupabaseRestClient(options?: {
  accessToken?: string | null;
  serviceRoleKey?: string | null;
}) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const key = options?.serviceRoleKey || anonKey;

  if (!url || !key) return null;

  const headers = {
    apikey: key,
    Authorization: `Bearer ${options?.accessToken || key}`,
    "Content-Type": "application/json",
  };

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers ?? {}),
      },
    });
    return parseResponse<T>(res);
  }

  return {
    url,
    select<T extends TableName>(
      table: T,
      params: URLSearchParams
    ): Promise<TableRow<T>[]> {
      return request<TableRow<T>[]>(
        `/rest/v1/${table}?${params.toString()}`,
        { method: "GET" }
      );
    },
    insert<T extends TableName>(
      table: T,
      body: TableInsert<T> | TableInsert<T>[],
      select = "*"
    ): Promise<TableRow<T>[]> {
      const params = new URLSearchParams({ select });
      return request<TableRow<T>[]>(`/rest/v1/${table}?${params.toString()}`, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
    },
    upsert<T extends TableName>(
      table: T,
      body: TableInsert<T> | TableInsert<T>[],
      options: { onConflict: string; select?: string }
    ): Promise<TableRow<T>[]> {
      const params = new URLSearchParams({
        on_conflict: options.onConflict,
        select: options.select ?? "*",
      });
      return request<TableRow<T>[]>(`/rest/v1/${table}?${params.toString()}`, {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(body),
      });
    },
    update<T extends TableName>(
      table: T,
      params: URLSearchParams,
      body: TableUpdate<T>,
      select = "*"
    ): Promise<TableRow<T>[]> {
      params.set("select", select);
      return request<TableRow<T>[]>(`/rest/v1/${table}?${params.toString()}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
    },
    delete<T extends TableName>(
      table: T,
      params: URLSearchParams
    ): Promise<TableRow<T>[]> {
      return request<TableRow<T>[]>(`/rest/v1/${table}?${params.toString()}`, {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      });
    },
    authSignInWithOtp(email: string, redirectTo?: string): Promise<unknown> {
      const params = new URLSearchParams();
      if (redirectTo) params.set("redirect_to", redirectTo);
      const suffix = params.toString() ? `?${params.toString()}` : "";
      return request<unknown>(`/auth/v1/otp${suffix}`, {
        method: "POST",
        body: JSON.stringify({
          email,
          create_user: true,
        }),
      });
    },
    authGetUser(accessToken: string): Promise<{ user: { id?: string; email?: string } | null }> {
      return request<{ user: { id?: string; email?: string } | null }>("/auth/v1/user", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    authSignOut(accessToken: string): Promise<unknown> {
      return request<unknown>("/auth/v1/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    storagePublicUrl(bucket: SupabaseStorageBucket, objectPath: string): string {
      const cleanPath = objectPath.replace(/^\/+/, "");
      return `${url}/storage/v1/object/public/${bucket}/${cleanPath}`;
    },
    storageUpload(
      bucket: SupabaseStorageBucket,
      objectPath: string,
      body: BodyInit,
      options?: { contentType?: string; upsert?: boolean }
    ): Promise<unknown> {
      const cleanPath = objectPath.replace(/^\/+/, "");
      return request<unknown>(`/storage/v1/object/${bucket}/${cleanPath}`, {
        method: "POST",
        headers: {
          ...(options?.contentType ? { "Content-Type": options.contentType } : {}),
          ...(options?.upsert ? { "x-upsert": "true" } : {}),
        },
        body,
      });
    },
    storageRemove(
      bucket: SupabaseStorageBucket,
      objectPaths: string[]
    ): Promise<unknown> {
      return request<unknown>(`/storage/v1/object/${bucket}`, {
        method: "DELETE",
        body: JSON.stringify({
          prefixes: objectPaths.map((objectPath) => objectPath.replace(/^\/+/, "")),
        }),
      });
    },
  };
}

let browserClient: SupabaseRestClient | null | undefined;
let browserClientToken: string | null | undefined;

export function getSupabaseClient(): SupabaseRestClient | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (browserClient === undefined || browserClientToken !== accessToken) {
    browserClient = createSupabaseRestClient({ accessToken });
    browserClientToken = accessToken;
  }
  return browserClient;
}

export function requireSupabaseClient(): SupabaseRestClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return client;
}

