#!/usr/bin/env node
/**
 * Create (or inspect) the giga3ai.com sending domain in Resend and print DNS records.
 *
 * Requires a FULL-ACCESS Resend API key (sending-only keys return 401 for /domains).
 *
 *   RESEND_API_KEY=re_... node scripts/setup-resend-domain.mjs
 *   RESEND_API_KEY=re_... RESEND_DOMAIN=giga3ai.com node scripts/setup-resend-domain.mjs
 *
 * After DNS is added in Cloudflare, re-run with VERIFY=1:
 *   VERIFY=1 RESEND_API_KEY=re_... node scripts/setup-resend-domain.mjs
 */

const apiKey = process.env.RESEND_API_KEY?.trim();
const domainName = (process.env.RESEND_DOMAIN || "giga3ai.com").trim();
const shouldVerify = process.env.VERIFY === "1" || process.env.VERIFY === "true";

if (!apiKey) {
  console.error("Set RESEND_API_KEY (full-access) before running.");
  process.exit(1);
}

async function resend(path, init = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json;
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

function printRecords(records = []) {
  if (!records.length) {
    console.log("(no DNS records returned — open https://resend.com/domains)");
    return;
  }
  console.log("\nAdd these DNS records in Cloudflare → DNS for", domainName);
  console.log("-".repeat(72));
  for (const rec of records) {
    const priority =
      rec.priority != null ? ` (priority ${rec.priority})` : "";
    console.log(
      `${rec.type}\t${rec.name}\t${rec.value}${priority}\t# ${rec.record || ""}`
    );
  }
  console.log("-".repeat(72));
}

async function main() {
  let list;
  try {
    list = await resend("/domains");
  } catch (error) {
    if (error.status === 401) {
      console.error(
        "This API key cannot manage domains (sending-only).\n" +
          "Create a full-access key at https://resend.com/api-keys and retry."
      );
      process.exit(2);
    }
    throw error;
  }

  const existing = (list.data || list || []).find?.(
    (d) => d.name === domainName
  ) || (Array.isArray(list) ? list.find((d) => d.name === domainName) : null);

  let domain = existing;
  if (!domain) {
    console.log(`Creating domain ${domainName}…`);
    domain = await resend("/domains", {
      method: "POST",
      body: JSON.stringify({ name: domainName }),
    });
  } else {
    console.log(`Domain already exists: ${domainName} (id=${domain.id}, status=${domain.status})`);
    domain = await resend(`/domains/${domain.id}`);
  }

  printRecords(domain.records || []);

  if (shouldVerify && domain.id) {
    console.log(`\nTriggering verification for ${domain.id}…`);
    await resend(`/domains/${domain.id}/verify`, { method: "POST" });
    const refreshed = await resend(`/domains/${domain.id}`);
    console.log(`Status after verify request: ${refreshed.status}`);
  } else {
    console.log(
      "\nAfter DNS propagates, run again with VERIFY=1, then:\n" +
        '  npx convex env set AUTH_FROM_EMAIL "Giga3 AI <noreply@giga3ai.com>"'
    );
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
