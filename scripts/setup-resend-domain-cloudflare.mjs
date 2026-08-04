#!/usr/bin/env node
/**
 * Create/verify a Resend sending domain and publish its DNS records to Cloudflare.
 * Then set AUTH_FROM_EMAIL on Convex production.
 *
 * Env:
 *   RESEND_API_KEY (full access)
 *   CF_API_TOKEN (Zone DNS Edit)
 *   CF_ACCOUNT_ID (optional; used to disambiguate zones)
 *   RESEND_DOMAIN (default giga3ai.com)
 *   AUTH_FROM_EMAIL (default Giga3 AI <noreply@giga3ai.com>)
 *   CONVEX_DEPLOY_KEY or CONVEX_DEPLOYMENT_VALUE
 */

import { spawnSync } from "node:child_process";

const domainName = (process.env.RESEND_DOMAIN || "giga3ai.com").trim();
const fromEmail =
  process.env.AUTH_FROM_EMAIL?.trim() || `Giga3 AI <noreply@${domainName}>`;
const resendKey = process.env.RESEND_API_KEY?.trim();
const cfToken = process.env.CF_API_TOKEN?.trim();
const cfAccountId = process.env.CF_ACCOUNT_ID?.trim();
const deployKey = (
  process.env.CONVEX_DEPLOY_KEY ||
  process.env.CONVEX_DEPLOYMENT_VALUE ||
  ""
).trim();

function fail(msg, code = 1) {
  console.error(`::error::${msg}`);
  process.exit(code);
}

async function resend(path, init = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      `Resend ${res.status}: ${json.message || json.name || text.slice(0, 200)}`
    );
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const msg =
      json?.errors?.map((e) => e.message).join("; ") ||
      `Cloudflare HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json.result;
}

function recordHost(name) {
  if (!name || name === "@") return domainName;
  if (name.endsWith(`.${domainName}`) || name === domainName) return name;
  return `${name}.${domainName}`;
}

async function upsertDnsRecord(zoneId, rec) {
  const type = String(rec.type || "").toUpperCase();
  const name = recordHost(rec.name);
  const content = String(rec.value || "").replace(/^"|"$/g, "");
  const priority = rec.priority != null ? Number(rec.priority) : undefined;

  const existing = await cf(
    `/zones/${zoneId}/dns_records?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}&per_page=50`
  );
  const match = (existing || []).find((row) => {
    if (priority != null && row.priority != null && Number(row.priority) !== priority) {
      return false;
    }
    return true;
  });

  const body = {
    type,
    name,
    content,
    ttl: 1,
    proxied: false,
    ...(priority != null && !Number.isNaN(priority) ? { priority } : {}),
  };

  if (match?.id) {
    console.log(`Updating ${type} ${name}`);
    await cf(`/zones/${zoneId}/dns_records/${match.id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  } else {
    console.log(`Creating ${type} ${name}`);
    await cf(`/zones/${zoneId}/dns_records`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}

function setConvexFromEmail() {
  if (!deployKey) {
    console.warn("No CONVEX_DEPLOY_KEY — skip AUTH_FROM_EMAIL sync");
    return;
  }
  const env = { ...process.env, CONVEX_DEPLOY_KEY: deployKey };
  const result = spawnSync(
    "npx",
    ["convex", "env", "set", "AUTH_FROM_EMAIL", fromEmail],
    { env, encoding: "utf8" }
  );
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    fail("Failed to set AUTH_FROM_EMAIL on Convex");
  }
  console.log(`AUTH_FROM_EMAIL set to ${fromEmail}`);
}

async function waitForVerified(domainId, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    const domain = await resend(`/domains/${domainId}`);
    console.log(`Verify poll ${i + 1}/${attempts}: status=${domain.status}`);
    if (domain.status === "verified") return domain;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return resend(`/domains/${domainId}`);
}

async function main() {
  if (!resendKey) fail("RESEND_API_KEY is missing");
  if (!cfToken) fail("CF_API_TOKEN is missing");

  let list;
  try {
    list = await resend("/domains");
  } catch (error) {
    if (error.status === 401) {
      fail(
        "RESEND_API_KEY is sending-only. Create a full-access key at https://resend.com/api-keys, update the GitHub secret RESEND_API_KEY, then re-run this workflow."
      );
    }
    throw error;
  }

  const rows = list.data || list || [];
  let domain = (Array.isArray(rows) ? rows : []).find((d) => d.name === domainName);
  if (!domain) {
    console.log(`Creating Resend domain ${domainName}`);
    domain = await resend("/domains", {
      method: "POST",
      body: JSON.stringify({ name: domainName }),
    });
  } else {
    console.log(`Resend domain exists id=${domain.id} status=${domain.status}`);
    domain = await resend(`/domains/${domain.id}`);
  }

  const records = domain.records || [];
  if (!records.length) fail("Resend returned no DNS records");

  const zonesPath = cfAccountId
    ? `/zones?name=${encodeURIComponent(domainName)}&account.id=${encodeURIComponent(cfAccountId)}`
    : `/zones?name=${encodeURIComponent(domainName)}`;
  const zones = await cf(zonesPath);
  const zone = (zones || [])[0];
  if (!zone?.id) {
    fail(
      `Cloudflare zone not found for ${domainName}. Ensure CF_API_TOKEN can read DNS for this zone.`
    );
  }
  console.log(`Cloudflare zone ${zone.id}`);

  for (const rec of records) {
    // Tracking CNAME is optional for transactional mail; still add if present.
    try {
      await upsertDnsRecord(zone.id, rec);
    } catch (error) {
      console.warn(`DNS upsert warning for ${rec.type} ${rec.name}: ${error.message}`);
    }
  }

  console.log("Triggering Resend domain verify…");
  await resend(`/domains/${domain.id}/verify`, { method: "POST" });
  const finalDomain = await waitForVerified(domain.id);
  console.log(`Final Resend status: ${finalDomain.status}`);

  if (finalDomain.status !== "verified") {
    fail(
      `Domain not verified yet (status=${finalDomain.status}). Wait for DNS propagation and re-run this workflow.`
    );
  }

  setConvexFromEmail();
  console.log("Done — password reset can send to any recipient from the verified domain.");
}

main().catch((error) => {
  fail(error.message || String(error));
});
