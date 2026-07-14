export type DataBackend = "convex" | "supabase";

/** Prefer Supabase when fully configured — avoids Convex free-tier query crashes on load. */
export function getDataBackend(): DataBackend {
  const raw = process.env.NEXT_PUBLIC_GIGA3_DATA_BACKEND?.trim().toLowerCase();
  if (raw === "supabase" || raw === "convex") return raw;
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  if (hasSupabase) return "supabase";
  return "convex";
}

export function isSupabaseDataBackend(): boolean {
  return getDataBackend() === "supabase";
}
