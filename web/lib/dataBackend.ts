export type DataBackend = "convex" | "supabase";

const DEFAULT_BACKEND: DataBackend = "convex";

export function getDataBackend(): DataBackend {
  const raw = process.env.NEXT_PUBLIC_GIGA3_DATA_BACKEND?.trim().toLowerCase();
  return raw === "supabase" ? "supabase" : DEFAULT_BACKEND;
}

export function isSupabaseDataBackend(): boolean {
  return getDataBackend() === "supabase";
}

