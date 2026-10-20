"use node";

/**
 * Moodle web-service helpers (per-user site URL + token).
 * Destination IPs are resolved and checked before connect; HTTPS connects to the
 * pinned public address with Host/SNI set to the original hostname (DNS-rebinding guard).
 */

import https from "node:https";
import { lookup as dnsLookup } from "node:dns/promises";
import { ipv4ToInt } from "../../liveWeb/browsePolicy";
import {
  isBlockedHostname,
  isProhibitedMoodleDestinationIp,
  normalizeSiteUrl,
} from "../moodleUrl";

const MOODLE_FETCH_TIMEOUT_MS = 15_000;
/** Conservative response-size limit (~1 MiB). */
const MOODLE_MAX_RESPONSE_BYTES = 1_048_576;

export type MoodleAddressResolver = (hostname: string) => Promise<string[]>;

export type MoodleTransportRequest = {
  hostname: string;
  port: number;
  path: string;
  body: string;
  connectAddress: string;
  signal: AbortSignal;
  timeoutMs: number;
  maxBytes: number;
};

export type MoodleTransportResponse = {
  status: number;
  headers: Record<string, string | undefined>;
  body: string;
};

export type MoodleTransport = (
  req: MoodleTransportRequest
) => Promise<MoodleTransportResponse>;

async function defaultResolver(hostname: string): Promise<string[]> {
  if (isProhibitedMoodleDestinationIp(hostname) || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return [hostname];
  }
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map((r) => r.address);
}

let addressResolver: MoodleAddressResolver = defaultResolver;

/** Tests replace DNS. Production uses Node's resolver. */
export function setMoodleAddressResolverForTests(
  next: MoodleAddressResolver | null
): void {
  addressResolver = next ?? defaultResolver;
}

async function assertMoodleResolvedAddresses(hostname: string): Promise<string> {
  let addresses: string[];
  try {
    addresses = await addressResolver(hostname);
  } catch {
    throw new Error("Moodle site DNS lookup failed.");
  }
  if (!addresses.length) {
    throw new Error("Moodle site DNS lookup failed.");
  }
  for (const address of addresses) {
    if (isProhibitedMoodleDestinationIp(address)) {
      throw new Error("Moodle site destination is not allowed.");
    }
  }
  // Prefer IPv4 for pinning when available.
  const v4 = addresses.find((a) => ipv4ToInt(a) !== null);
  return v4 ?? addresses[0]!;
}

function defaultHttpsTransport(req: MoodleTransportRequest): Promise<MoodleTransportResponse> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string | number> = {
      Host: req.hostname,
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(req.body),
      Connection: "close",
    };

    const request = https.request(
      {
        protocol: "https:",
        method: "POST",
        // Connect to the pre-validated IP (connection-time enforcement).
        host: req.connectAddress,
        port: req.port,
        path: req.path,
        servername: req.hostname, // TLS SNI
        headers,
        timeout: req.timeoutMs,
        // Do not use the default agent redirect behaviour — https.request does not follow.
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const headerMap: Record<string, string | undefined> = {};
        for (const [k, v] of Object.entries(res.headers)) {
          headerMap[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
        }

        if (status >= 300 && status < 400) {
          res.resume();
          reject(new Error("Moodle redirect rejected."));
          return;
        }

        const contentLength = headerMap["content-length"];
        if (contentLength != null && contentLength !== "") {
          const declared = Number(contentLength);
          if (Number.isFinite(declared) && declared > req.maxBytes) {
            res.destroy();
            reject(new Error("Moodle response too large."));
            return;
          }
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > req.maxBytes) {
            res.destroy();
            reject(new Error("Moodle response too large."));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve({
            status,
            headers: headerMap,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        res.on("error", reject);
      }
    );

    const onAbort = () => {
      request.destroy();
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      reject(err);
    };
    if (req.signal.aborted) {
      onAbort();
      return;
    }
    req.signal.addEventListener("abort", onAbort, { once: true });

    request.on("timeout", () => {
      request.destroy();
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      reject(err);
    });
    request.on("error", (e) => {
      req.signal.removeEventListener("abort", onAbort);
      reject(e);
    });
    request.write(req.body);
    request.end();
  });
}

let transport: MoodleTransport = defaultHttpsTransport;

export function setMoodleTransportForTests(next: MoodleTransport | null): void {
  transport = next ?? defaultHttpsTransport;
}

async function moodleCall(
  siteUrl: string,
  token: string,
  wsfunction: string,
  params: Record<string, string> = {}
) {
  const base = normalizeSiteUrl(siteUrl);
  const parsed = new URL(`${base}/webservice/rest/server.php`);
  const connectAddress = await assertMoodleResolvedAddresses(parsed.hostname);

  const body = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
    ...params,
  }).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOODLE_FETCH_TIMEOUT_MS);
  try {
    const res = await transport({
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 443,
      path: `${parsed.pathname}${parsed.search}`,
      body,
      connectAddress,
      signal: controller.signal,
      timeoutMs: MOODLE_FETCH_TIMEOUT_MS,
      maxBytes: MOODLE_MAX_RESPONSE_BYTES,
    });

    if (res.status >= 300 && res.status < 400) {
      throw new Error("Moodle redirect rejected.");
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`Moodle request failed (${res.status})`);
    }

    let json: unknown;
    try {
      json = JSON.parse(res.body) as unknown;
    } catch {
      throw new Error("Moodle returned an invalid response.");
    }

    if (json && typeof json === "object" && "exception" in json) {
      const err = json as { message?: string; errorcode?: string };
      throw new Error(err.message || err.errorcode || "Moodle web service error");
    }
    return json;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Moodle request timed out.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyMoodleToken(siteUrl: string, token: string) {
  const siteInfo = (await moodleCall(
    siteUrl,
    token,
    "core_webservice_get_site_info",
    {}
  )) as { sitename?: string; username?: string; userid?: number };
  return {
    siteName: siteInfo.sitename ?? "Moodle",
    username: siteInfo.username,
    userId: siteInfo.userid,
  };
}

export async function listMoodleCourses(siteUrl: string, token: string) {
  const siteInfo = await verifyMoodleToken(siteUrl, token);
  if (!siteInfo.userId) return [];
  const courses = (await moodleCall(
    siteUrl,
    token,
    "core_enrol_get_users_courses",
    { userid: String(siteInfo.userId) }
  )) as Array<{ id: number; fullname: string; shortname: string; summary?: string }>;
  return Array.isArray(courses) ? courses : [];
}

export async function getMoodleCourse(
  siteUrl: string,
  token: string,
  courseId: number
) {
  const courses = (await moodleCall(
    siteUrl,
    token,
    "core_course_get_courses_by_field",
    { field: "id", value: String(courseId) }
  )) as { courses?: Array<Record<string, unknown>> };
  return courses.courses?.[0] ?? null;
}

export async function listMoodleAssignments(
  siteUrl: string,
  token: string,
  courseIds: number[]
) {
  if (!courseIds.length) return [];
  const params: Record<string, string> = {};
  courseIds.forEach((id, i) => {
    params[`courseids[${i}]`] = String(id);
  });
  try {
    const result = (await moodleCall(
      siteUrl,
      token,
      "mod_assign_get_assignments",
      params
    )) as {
      courses?: Array<{ id: number; assignments?: Array<Record<string, unknown>> }>;
    };
    return result.courses ?? [];
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `${e.message} (assignment APIs may be disabled on this Moodle site)`
        : "Assignment APIs unavailable on this Moodle site"
    );
  }
}

export {
  normalizeSiteUrl,
  isBlockedHostname,
  isProhibitedMoodleDestinationIp,
} from "../moodleUrl";

export { MOODLE_MAX_RESPONSE_BYTES, MOODLE_FETCH_TIMEOUT_MS };
