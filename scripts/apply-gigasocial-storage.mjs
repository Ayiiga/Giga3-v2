#!/usr/bin/env node
/**
 * Apply GigaSocial Supabase storage buckets (social-images, social-videos).
 * RLS policy updates require SQL — run supabase/migrations/20260708120000_gigasocial_storage.sql
 * via Supabase Dashboard → SQL Editor or `supabase db push` when linked.
 */

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/$/, "");
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ANON_SERVICE_ROLE ||
  "";

if (!url || !serviceKey) {
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const buckets = [
  {
    id: "social-images",
    name: "social-images",
    public: true,
    file_size_limit: 15 * 1024 * 1024,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "social-videos",
    name: "social-videos",
    public: true,
    file_size_limit: 100 * 1024 * 1024,
    allowed_mime_types: ["video/mp4", "video/webm", "video/quicktime"],
  },
];

async function ensureBucket(bucket) {
  const listRes = await fetch(`${url}/storage/v1/bucket`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!listRes.ok) {
    const text = await listRes.text();
    throw new Error(`List buckets failed (${listRes.status}): ${text.slice(0, 200)}`);
  }
  const existing = (await listRes.json()) ?? [];
  if (existing.some((b) => b.id === bucket.id || b.name === bucket.id)) {
    console.log(`Bucket ${bucket.id} already exists.`);
    return;
  }

  const createRes = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bucket),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Create bucket ${bucket.id} failed (${createRes.status}): ${text.slice(0, 200)}`);
  }
  console.log(`Created bucket ${bucket.id}.`);
}

async function main() {
  for (const bucket of buckets) {
    await ensureBucket(bucket);
  }
  console.log(
    "Buckets ready. Apply RLS policies from supabase/migrations/20260708120000_gigasocial_storage.sql in SQL Editor if not already applied."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
