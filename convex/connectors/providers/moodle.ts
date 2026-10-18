/** Moodle web-service helpers (per-user site URL + token). */

type FetchLike = typeof fetch;

const MOODLE_FETCH_TIMEOUT_MS = 15_000;

/** Block localhost, link-local, and private/reserved IPv4 literals (SSRF). */
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h === "localhost.localdomain" ||
    h === "metadata.google.internal" ||
    h.endsWith(".internal") ||
    h === "0.0.0.0"
  ) {
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

  // Reject IPv6 literals (incl. ::1 / ULA / link-local) — use hostnames only.
  if (h.includes(":")) return true;

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
  let res: Response;
  try {
    res = await fetchImpl(`${base}/webservice/rest/server.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Moodle request timed out.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json()) as
    | { exception?: string; message?: string; errorcode?: string }
    | unknown;
  if (!res.ok) throw new Error(`Moodle request failed (${res.status})`);
  if (json && typeof json === "object" && "exception" in json) {
    const err = json as { message?: string; errorcode?: string };
    throw new Error(err.message || err.errorcode || "Moodle web service error");
  }
  return json;
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
    // Not every Moodle site enables this function.
    throw new Error(
      e instanceof Error
        ? `${e.message} (assignment APIs may be disabled on this Moodle site)`
        : "Assignment APIs unavailable on this Moodle site"
    );
  }
}

export { normalizeSiteUrl, isBlockedHostname };
