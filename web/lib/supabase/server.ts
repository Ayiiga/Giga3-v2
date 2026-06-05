import "server-only";

import { createSupabaseRestClient } from "@/lib/supabase";

export function getSupabaseServerClient(options?: { serviceRole?: boolean }) {
  return createSupabaseRestClient({
    serviceRoleKey: options?.serviceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : null,
  });
}

export function requireSupabaseServerClient(options?: { serviceRole?: boolean }) {
  const client = getSupabaseServerClient(options);
  if (!client) {
    throw new Error(
      options?.serviceRole
        ? "Missing SUPABASE_SERVICE_ROLE_KEY or public Supabase env"
        : "Missing public Supabase env"
    );
  }
  return client;
}

