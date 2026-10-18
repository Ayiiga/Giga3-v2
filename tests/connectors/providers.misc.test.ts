import { describe, expect, it, vi } from "vitest";
import { microsoftAuthUrl, createCalendarEvent } from "../../convex/connectors/providers/microsoft";
import { zoomAuthUrl, createZoomMeeting } from "../../convex/connectors/providers/zoom";
import { notionAuthUrl, notionSearch } from "../../convex/connectors/providers/notion";
import { normalizeSiteUrl, verifyMoodleToken } from "../../convex/connectors/providers/moodle";

describe("microsoft / zoom / notion / moodle providers", () => {
  it("builds Microsoft and Zoom authorize URLs", () => {
    expect(
      microsoftAuthUrl({
        clientId: "ms",
        redirectUri: "https://cb",
        scopes: ["Calendars.Read"],
        state: "s1",
      })
    ).toContain("login.microsoftonline.com/common");
    expect(
      zoomAuthUrl({
        clientId: "z",
        redirectUri: "https://cb",
        state: "s2",
      })
    ).toContain("zoom.us/oauth/authorize");
    expect(
      notionAuthUrl({
        clientId: "n",
        redirectUri: "https://cb",
        state: "s3",
      })
    ).toContain("api.notion.com/v1/oauth/authorize");
  });

  it("creates calendar events and zoom meetings only through mocked APIs", async () => {
    const msFetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "evt1" }), { status: 200 })
    ) as unknown as typeof fetch;
    await expect(
      createCalendarEvent(
        "tok",
        {
          subject: "Study",
          startIso: "2026-01-01T10:00:00",
          endIso: "2026-01-01T11:00:00",
        },
        msFetch
      )
    ).resolves.toEqual({ id: "evt1" });

    const zoomFetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: 9, join_url: "https://zoom.us/j/1" }), {
        status: 200,
      })
    ) as unknown as typeof fetch;
    await expect(
      createZoomMeeting("tok", { topic: "Class" }, zoomFetch)
    ).resolves.toMatchObject({ join_url: "https://zoom.us/j/1" });
  });

  it("searches Notion with mocked fetch", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ results: [{ id: "page" }] }), { status: 200 })
    ) as unknown as typeof fetch;
    expect(await notionSearch("tok", "notes", fetchImpl)).toEqual([{ id: "page" }]);
  });

  it("validates Moodle https URLs and verifies tokens via mock", async () => {
    expect(() => normalizeSiteUrl("http://insecure.example")).toThrow(/https/);
    expect(() => normalizeSiteUrl("https://127.0.0.1/moodle")).toThrow(/not allowed/);
    expect(() => normalizeSiteUrl("https://169.254.169.254/latest")).toThrow(/not allowed/);
    expect(() => normalizeSiteUrl("https://localhost/moodle")).toThrow(/not allowed/);
    expect(() => normalizeSiteUrl("https://user:pass@moodle.example.edu")).toThrow(
      /credentials/
    );
    expect(normalizeSiteUrl("https://moodle.example.edu/path/")).toBe(
      "https://moodle.example.edu/path"
    );
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      return new Response(
        JSON.stringify({ sitename: "Campus LMS", username: "student", userid: 3 }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;
    await expect(
      verifyMoodleToken("https://moodle.example.edu", "token-value-123456", fetchImpl)
    ).resolves.toMatchObject({ siteName: "Campus LMS", userId: 3 });
  });
});
