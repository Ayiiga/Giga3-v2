import { describe, expect, it, vi } from "vitest";
import {
  exchangeGoogleCode,
  extractGmailPlainText,
  googleAuthUrl,
  listDriveFiles,
} from "../../convex/connectors/providers/google";

describe("google provider helpers", () => {
  it("builds authorize URL with offline access and state", () => {
    const url = googleAuthUrl({
      clientId: "client",
      redirectUri: "https://example.convex.site/connectors/oauth/callback",
      scopes: ["openid", "https://www.googleapis.com/auth/drive.readonly"],
      state: "abc",
    });
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("state=abc");
    expect(url).toContain(encodeURIComponent("drive.readonly"));
  });

  it("exchanges code via mocked token endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 }), {
        status: 200,
      })
    ) as unknown as typeof fetch;
    const tokens = await exchangeGoogleCode(
      {
        clientId: "id",
        clientSecret: "secret",
        redirectUri: "https://cb",
        code: "code",
      },
      fetchImpl
    );
    expect(tokens.access_token).toBe("at");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("lists drive files via mocked API and surfaces provider errors", async () => {
    const okFetch = vi.fn(async () =>
      new Response(JSON.stringify({ files: [{ id: "1", name: "Doc" }] }), { status: 200 })
    ) as unknown as typeof fetch;
    expect(await listDriveFiles("token", { query: "notes" }, okFetch)).toEqual([
      { id: "1", name: "Doc" },
    ]);

    const errFetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "Rate limit" } }), { status: 429 })
    ) as unknown as typeof fetch;
    await expect(listDriveFiles("token", {}, errFetch)).rejects.toThrow(/Rate limit/);
  });

  it("extracts gmail plaintext without trusting headers blindly", () => {
    const body = btoa("Hello student");
    const text = extractGmailPlainText({
      payload: {
        headers: [
          { name: "Subject", value: "Hi" },
          { name: "From", value: "teacher@school.edu" },
        ],
        body: { data: body.replace(/\+/g, "-").replace(/\//g, "_") },
      },
    });
    expect(text).toContain("teacher@school.edu");
    expect(text).toContain("Hello student");
  });
});
