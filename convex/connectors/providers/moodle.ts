/** Moodle web-service helpers (per-user site URL + token). */

type FetchLike = typeof fetch;

const MOODLE_FETCH_TIMEOUT_MS = 15_000;
/** Conservative response-size limit (~1 MiB). */
const MOODLE_MAX_RESPONSE_BYTES = 1_048_576;

/**
 * Block localhost, link-local, private/reserved IPv4 literals, and IPv6 literals.
 * Hostname checks alone do not stop DNS rebinding — redirects are refused so the
 * validated URL cannot be swapped mid-request.
 */
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "localhost.localdomain" ||
    h === "metadata.google.internal" ||
    h.endsWith(".internal") ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h === "[::]"
  ) {
    return true;
  }

  // Unusual numeric / hex host forms that can encode loopback (e.g. 2130706433).
  if (/^0x[0-9a-f]+$/i.test(h) || /^\d+$/.test(h)) {
    return true;
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number);
    if (parts.some((p) => p > 255)) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  // Incomplete dotted quads / weird dotted forms.
  if (/^\d+(\.\d+)*$/.test(h)) return true;

  // Reject IPv6 literals (incl. ::1 / ULA / link-local) — use hostnames only.
  if (h.includes(":") || h.startsWith("[")) return true;

  return false;
}

function normalizeSiteUrl(siteUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(siteUrl.trim());
  } catch {
    throw new Error("Invalid Moodle site URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Moodle site URL must use https://");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Moodle site URL must not include credentials.");
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Moodle site URL host is not allowed.");
  }
  const path = parsed.pathname.replace(/\/$/, "");
  return `${parsed.protocol}//${parsed.host}${path}`;
}

async function readResponseTextLimited(
  res: Response,
  maxBytes: number,
  signal: AbortSignal
): Promise<string> {
  const contentLength = res.headers.get("content-length");
  if (contentLength != null && contentLength !== "") {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new Error("Moodle response too large.");
    }
  }

  if (!res.body || typeof res.body.getReader !== "function") {
    const text = await res.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error("Moodle response too large.");
    }
    return text;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (signal.aborted) {
        const abortErr = new Error("The operation was aborted.");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Moodle response too large.");
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

async function moodleCall(
  siteUrl: string,
  token: string,
  wsfunction: string,
  params: Record<string, string> = {},
  fetchImpl: FetchLike = fetch
) {
  const base = normalizeSiteUrl(siteUrl);
  const body = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
    ...params,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOODLE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${base}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
      // Never follow redirects — token must not be posted to another host.
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      throw new Error("Moodle redirect rejected.");
    }
    if (!res.ok) {
      // Drain/cancel body under the same timeout, then fail without leaking details.
      try {
        await readResponseTextLimited(res, MOODLE_MAX_RESPONSE_BYTES, controller.signal);
      } catch {
        /* ignore drain errors */
      }
      throw new Error(`Moodle request failed (${res.status})`);
    }

    const text = await readResponseTextLimited(
      res,
      MOODLE_MAX_RESPONSE_BYTES,
      controller.signal
    );

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      throw new Error("Moodle returned an invalid response.");
    }

    if (json && typeof json === "object" && "exception" in json) {
      const err = json as { message?: string; errorcode?: string };
      // Surface Moodle WS error codes/messages only — never tokens or request bodies.
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

export async function verifyMoodleToken(
  siteUrl: string,
  token: string,
  fetchImpl: FetchLike = fetch
) {
  const siteInfo = (await moodleCall(
    siteUrl,
    token,
    "core_webservice_get_site_info",
    {},
    fetchImpl
  )) as { sitename?: string; username?: string; userid?: number };
  return {
    siteName: siteInfo.sitename ?? "Moodle",
    username: siteInfo.username,
    userId: siteInfo.userid,
  };
}

export async function listMoodleCourses(
  siteUrl: string,
  token: string,
  fetchImpl: FetchLike = fetch
) {
  const siteInfo = await verifyMoodleToken(siteUrl, token, fetchImpl);
  if (!siteInfo.userId) return [];
  const courses = (await moodleCall(
    siteUrl,
    token,
    "core_enrol_get_users_courses",
    { userid: String(siteInfo.userId) },
    fetchImpl
  )) as Array<{ id: number; fullname: string; shortname: string; summary?: string }>;
  return Array.isArray(courses) ? courses : [];
}

export async function getMoodleCourse(
  siteUrl: string,
  token: string,
  courseId: number,
  fetchImpl: FetchLike = fetch
) {
  const courses = (await moodleCall(
    siteUrl,
    token,
    "core_course_get_courses_by_field",
    { field: "id", value: String(courseId) },
    fetchImpl
  )) as { courses?: Array<Record<string, unknown>> };
  return courses.courses?.[0] ?? null;
}

export async function listMoodleAssignments(
  siteUrl: string,
  token: string,
  courseIds: number[],
  fetchImpl: FetchLike = fetch
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
      params,
      fetchImpl
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
  MOODLE_MAX_RESPONSE_BYTES,
  MOODLE_FETCH_TIMEOUT_MS,
};
