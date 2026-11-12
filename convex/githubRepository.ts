import { v } from "convex/values";
import { action } from "./_generated/server";
import { requireSession } from "./auth";

function repoPath(repository: string) {
  const parts = repository.trim().split("/");
  if (parts.length !== 2 || parts.some((part) => !/^[\w.-]+$/.test(part) || part === "." || part === "..")) {
    throw new Error("Enter a repository as owner/name.");
  }
  return "/repos/" + parts.map(encodeURIComponent).join("/");
}

function filePath(path: string) {
  const parts = path.trim().split("/");
  if (parts.some((part) => !part || part === "." || part === ".." || /[\\\x00-\x1f]/.test(part))) {
    throw new Error("Enter a repository-relative file path.");
  }
  return parts.map(encodeURIComponent).join("/");
}

async function github<T>(path: string, token?: string, method = "GET", body?: object): Promise<T> {
  if (token && !/^github_pat_[A-Za-z0-9_]+$/.test(token)) {
    throw new Error("Use a fine-grained GitHub personal access token.");
  }
  const response = await fetch("https://api.github.com" + path, {
    method, redirect: "error", signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}. Check repository access and permissions.`);
  return response.json() as Promise<T>;
}

type GitHubFile = { type: string; encoding: string; content: string; sha: string; size: number; html_url: string };

export const read = action({
  args: { sessionToken: v.string(), repository: v.string(), path: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken, ctx);
    const file = await github<GitHubFile>(repoPath(args.repository) + "/contents/" + filePath(args.path), args.token);
    if (file.type !== "file" || file.encoding !== "base64" || file.size > 200_000) {
      throw new Error("Select a text file smaller than 200 KB.");
    }
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g, "")), (char) => char.charCodeAt(0));
    return { content: new TextDecoder("utf-8", { fatal: true }).decode(bytes), url: file.html_url, sha: file.sha };
  },
});

export const openPullRequest = action({
  args: {
    sessionToken: v.string(), repository: v.string(), path: v.string(), token: v.string(),
    content: v.string(), title: v.string(), expectedSha: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSession(args.sessionToken, ctx);
    const repo = repoPath(args.repository);
    const path = repo + "/contents/" + filePath(args.path);
    const title = args.title.trim();
    const bytes = new TextEncoder().encode(args.content);
    if (!title || title.length > 180 || bytes.length > 200_000 || !args.token) {
      throw new Error("Enter a title, a fine-grained token, and a file under 200 KB.");
    }
    const repository = await github<{ default_branch: string }>(repo, args.token);
    const base = repository.default_branch;
    const reference = await github<{ object: { sha: string } }>(
      repo + "/git/ref/heads/" + base.split("/").map(encodeURIComponent).join("/"), args.token,
    );
    const branch = `giga3/${crypto.randomUUID()}`;
    await github(repo + "/git/refs", args.token, "POST", { ref: "refs/heads/" + branch, sha: reference.object.sha });
    try {
      await github(path, args.token, "PUT", {
        branch, message: title,
        content: btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")),
        ...(args.expectedSha ? { sha: args.expectedSha } : {}),
      });
    } catch {
      throw new Error(`GitHub did not confirm the commit on ${branch}. Check file changes and Contents write permission.`);
    }
    try {
      const pull = await github<{ html_url: string }>(repo + "/pulls", args.token, "POST", { title, head: branch, base });
      return { url: pull.html_url, branch };
    } catch {
      throw new Error(`Committed to ${branch}. GitHub did not confirm the pull request. Check Pull requests write permission.`);
    }
  },
});
