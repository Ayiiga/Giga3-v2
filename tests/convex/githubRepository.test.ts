/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { createSessionToken } from "../../convex/sessionAuth";

const modules = import.meta.glob("../../convex/**/*.*s");

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GitHub repository actions", () => {
  it("rejects an unsigned request before contacting GitHub", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, modules);
    await expect(t.action(api.githubRepository.read, {
      sessionToken: "", repository: "owner/repo", path: "src/app.ts",
    })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads a text file and commits a confirmed edit on a separate branch", async () => {
    vi.stubEnv("SESSION_SIGNING_SECRET", "local-github-repository-test-secret");
    const sessionToken = await createSessionToken("developer@example.com");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        type: "file", encoding: "base64", content: btoa("old"), sha: "old-blob",
        size: 3, html_url: "https://github.com/owner/repo/blob/main/src/app.ts",
      }))
      .mockResolvedValueOnce(Response.json({ default_branch: "main" }))
      .mockResolvedValueOnce(Response.json({ object: { sha: "base-commit" } }))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json({}))
      .mockResolvedValueOnce(Response.json({ html_url: "https://github.com/owner/repo/pull/1" }));
    vi.stubGlobal("fetch", fetchMock);
    const t = convexTest(schema, modules);
    const target = { sessionToken, repository: "owner/repo", path: "src/app.ts" };
    const file = await t.action(api.githubRepository.read, target);
    expect(file.content).toBe("old");
    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBeUndefined();

    const result = await t.action(api.githubRepository.openPullRequest, {
      ...target, token: "github_pat_test", expectedSha: file.sha, content: "new", title: "Update app",
    });
    expect(result.url).toBe("https://github.com/owner/repo/pull/1");
    expect(result.branch).toMatch(/^giga3\//);
    expect(JSON.parse(fetchMock.mock.calls[3]?.[1]?.body)).toEqual({
      ref: `refs/heads/${result.branch}`, sha: "base-commit",
    });
    expect(JSON.parse(fetchMock.mock.calls[4]?.[1]?.body)).toMatchObject({
      branch: result.branch, sha: "old-blob", content: btoa("new"),
    });
    expect(JSON.parse(fetchMock.mock.calls[5]?.[1]?.body)).toMatchObject({
      base: "main", head: result.branch,
    });
  });
});
