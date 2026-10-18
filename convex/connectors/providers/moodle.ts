/** Moodle web-service helpers (per-user site URL + token). */

type FetchLike = typeof fetch;

function normalizeSiteUrl(siteUrl: string): string {
  const trimmed = siteUrl.trim().replace(/\/$/, "");
  if (!/^https:\/\//i.test(trimmed)) {
    throw new Error("Moodle site URL must use https://");
  }
  return trimmed;
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
  const res = await fetchImpl(`${base}/webservice/rest/server.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
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
    )) as { courses?: Array<{ id: number; assignments?: Array<Record<string, unknown>> }> };
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

export { normalizeSiteUrl };
