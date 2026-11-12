"use node";

import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import https from "node:https";
import { v } from "convex/values";
import { requireSession } from "./auth";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { classifyBrowseUrl, BROWSE_USER_AGENT } from "./liveWeb/browsePolicy";
import { isProhibitedMoodleDestinationIp } from "./connectors/moodleUrl";
import { ensureFreshAccessToken } from "./connectors/tokenAccess";

async function websiteDigest(target: string) {
  const result = classifyBrowseUrl(target);
  if (!result.ok || result.url.protocol !== "https:" || result.url.port) {
    throw new Error("Invalid website destination.");
  }
  const url = result.url;
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  const address = addresses.find((item) => item.family === 4)?.address;
  if (!address || isProhibitedMoodleDestinationIp(address)) {
    throw new Error("Website destination is blocked.");
  }

  const html = await new Promise<string>((resolve, reject) => {
    const request = https.get({
      hostname: address,
      servername: url.hostname,
      path: url.pathname + url.search,
      headers: { Host: url.host, "User-Agent": BROWSE_USER_AGENT, Accept: "text/html,text/plain" },
      agent: false,
      signal: AbortSignal.timeout(10_000),
    }, (response) => {
      if (response.statusCode !== 200 || !/^text\/(html|plain)\b/i.test(response.headers["content-type"] ?? "")) {
        response.destroy();
        reject(new Error("Use the final URL of a publicly available HTML or text page."));
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 1_048_576) {
          reject(new Error("Website exceeds the 1 MB monitoring limit."));
          response.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
      response.on("aborted", () => reject(new Error("Website response was interrupted.")));
    });
    request.on("error", reject);
  });
  const content = html.replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!content) throw new Error("No readable website text was found.");
  return createHash("sha256").update(content).digest("hex");
}

async function calendarAlerts(ctx: ActionCtx, row: Doc<"monitors">) {
  const token = await ensureFreshAccessToken(ctx, row.userId, "outlook_calendar");
  const now = Date.now();
  const leadMs = (row.leadMinutes ?? 30) * 60_000;
  const params = new URLSearchParams({
    startDateTime: new Date(now).toISOString(),
    endDateTime: new Date(now + leadMs + 60_000).toISOString(),
    $select: "id,subject,start,isCancelled",
    $top: "100",
  });
  const path = `/v1.0/me/calendars/${encodeURIComponent(row.calendarId!)}/calendarView`;
  let next = `https://graph.microsoft.com${path}?${params}`;
  const alerts: Array<{ key: string; title: string; eventAt: number }> = [];
  for (let page = 0; next && page < 5; page++) {
    const url = new URL(next);
    if (url.origin !== "https://graph.microsoft.com" || url.pathname.toLowerCase() !== path.toLowerCase()) {
      throw new Error("Unexpected calendar pagination URL.");
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Calendar access failed.");
    const data = await response.json() as {
      value: Array<{ id: string; subject?: string; isCancelled?: boolean; start?: { dateTime?: string } }>;
      "@odata.nextLink"?: string;
    };
    for (const event of data.value) {
      const date = event.start?.dateTime;
      const eventAt = date ? Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(date) ? date : date + "Z") : NaN;
      if (event.isCancelled || !Number.isFinite(eventAt) || eventAt <= now || eventAt - now > leadMs) continue;
      alerts.push({ key: `${event.id}:${eventAt}`, title: event.subject?.slice(0, 160) || "Calendar event", eventAt });
    }
    next = data["@odata.nextLink"] ?? "";
  }
  if (next) throw new Error("Calendar contains too many events in the reminder window.");
  return alerts;
}

export const run = internalAction({
  args: {},
  handler: async (ctx) => {
    const pending: Doc<"monitors">[] = await ctx.runQuery(internal.monitoring.due, {});
    for (let start = 0; start < pending.length; start += 8) {
      const results = await Promise.allSettled(pending.slice(start, start + 8).map(async ({ _id: id }) => {
        const job: { row: Doc<"monitors">; lease: number } | null = await ctx.runMutation(internal.monitoring.claim, { id });
        if (!job) return;
        const { row, lease } = job;
        try {
          if (row.kind === "calendar") {
            await ctx.runMutation(internal.monitoring.finish, { id, lease, alerts: await calendarAlerts(ctx, row) });
            return;
          }
          const digest = await websiteDigest(row.target);
          const alerts = row.digest && row.digest !== digest
            ? [{ key: String(lease), title: `Website changed: ${new URL(row.target).hostname}` }] : [];
          await ctx.runMutation(internal.monitoring.finish, { id, lease, digest, alerts });
        } catch {
          const error = row.kind === "calendar" ? "Calendar check failed. Check your Outlook connection."
            : "Website check failed. Use the final public HTTPS page URL.";
          await ctx.runMutation(internal.monitoring.finish, { id, lease, error, alerts: [] });
        }
      }));
      if (results.some((result) => result.status === "rejected")) console.error("A monitoring job could not be recorded.");
    }
  },
});

export const listCalendars = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const userId = await requireSession(sessionToken, ctx);
    const token = await ensureFreshAccessToken(ctx, userId, "outlook_calendar");
    const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars?$select=id,name&$top=100", {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Could not list Outlook calendars.");
    const data = await response.json() as { value: Array<{ id: string; name: string }> };
    return data.value.map(({ id, name }) => ({ id, name }));
  },
});
