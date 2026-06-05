#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";

const EXPECTED_REF = "bgkkrezloideuwfwkloz";
const requireNetwork = process.argv.includes("--require-network");

async function readLocalWebEnv() {
  const envPath = path.resolve(process.cwd(), "web/.env.local");
  const values = {};
  try {
    const raw = await readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      values[key] = parts.join("=").replace(/^['"]|['"]$/g, "");
    }
  } catch {
    /* ignored: CI can provide process env instead */
  }
  return values;
}

function decodeJwtPayload(token) {
  const [, payload] = token.split(".");
  if (!payload) return null;
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(normalized, "base64url").toString("utf8"));
}

function projectRefFromUrl(value) {
  const host = new URL(value).hostname;
  return host.split(".")[0];
}

async function verifyRest(url, anonKey) {
  const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const body = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    bodyPrefix: body.slice(0, 120),
  };
}

async function main() {
  const localEnv = await readLocalWebEnv();
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    localEnv.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    localEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !anonKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    process.exit(1);
  }

  const urlRef = projectRefFromUrl(url);
  const jwtPayload = decodeJwtPayload(anonKey);
  const jwtRef = jwtPayload?.ref;
  const refsMatch = urlRef === EXPECTED_REF && jwtRef === EXPECTED_REF;

  const result = {
    expectedRef: EXPECTED_REF,
    urlRef,
    jwtRef,
    refsMatch,
    rest: null,
  };

  if (!refsMatch) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  try {
    result.rest = await verifyRest(url, anonKey);
  } catch (err) {
    result.rest = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  console.log(JSON.stringify(result, null, 2));

  if (requireNetwork && !result.rest?.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

