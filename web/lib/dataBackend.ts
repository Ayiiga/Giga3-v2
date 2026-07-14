export type DataBackend = "convex" | "supabase";

/** Prefer Supabase when configured — avoids Convex free-tier query crashes on load. */
export function getDataBackend(): DataBackend {
  const raw = process.env.NEXT_PUBLIC_GIGA3_DATA_BACKEND?.trim().toLowerCase();
  if (raw === "supabase" || raw === "convex") return raw;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return "supabase";
  return "convex";
}

export function isSupabaseDataBackend(): boolean {
  return getDataBackend() === "supabase";
}
