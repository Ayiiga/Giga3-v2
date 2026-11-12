"use client";

import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSessionToken } from "@/lib/auth";

export function GitHubRepositoryPanel() {
  const read = useAction(api.githubRepository.read);
  const openPullRequest = useAction(api.githubRepository.openPullRequest);
  const [repository, setRepository] = useState("");
  const [path, setPath] = useState("");
  const [token, setToken] = useState("");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loaded, setLoaded] = useState<{ repository: string; path: string; url: string; sha: string }>();
  const [pull, setPull] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionToken = getSessionToken();
  const inputClass = "mt-1 block w-full rounded-lg border p-2";

  return (
    <form className="space-y-3 rounded-xl border p-4" onSubmit={async (event) => {
      event.preventDefault();
      if (!sessionToken) return;
      const operation = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
      setBusy(true);
      setError("");
      setPull("");
      setToken("");
      try {
        if (operation === "write") {
          const result = await openPullRequest({
            sessionToken, repository, path, token, content, title,
            expectedSha: loaded?.repository === repository && loaded.path === path ? loaded.sha : undefined,
          });
          setPull(result.url);
        } else {
          setLoaded(undefined);
          const file = await read({ sessionToken, repository, path, token: token || undefined });
          setLoaded({ repository, path, url: file.url, sha: file.sha });
          setContent(file.content);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "GitHub operation failed.");
      } finally {
        setBusy(false);
      }
    }}>
      <h2 className="text-xl font-semibold">GitHub repository</h2>
      <p className="text-sm text-muted">Read a file or open a pull request with one file change. For private reads or writes, use a fine-grained token limited to the repository. Writes require Contents and Pull requests write permissions.</p>
      <label className="block">Repository<input required className={inputClass} value={repository} onChange={(event) => { setRepository(event.target.value); setLoaded(undefined); setContent(""); }} placeholder="owner/repository" /></label>
      <label className="block">File path<input required className={inputClass} value={path} onChange={(event) => { setPath(event.target.value); setLoaded(undefined); setContent(""); }} placeholder="src/app.ts" /></label>
      <label className="block">Fine-grained GitHub token<input type="password" autoComplete="off" className={inputClass} value={token} onChange={(event) => setToken(event.target.value)} /></label>
      <Button type="submit" value="read" disabled={busy || !sessionToken}>Read file</Button>
      {loaded && <p><a href={loaded.url} target="_blank" rel="noreferrer" className="underline">View loaded file on GitHub</a></p>}
      <label className="block">File contents<textarea rows={10} spellCheck={false} className={inputClass + " font-mono"} value={content} onChange={(event) => setContent(event.target.value)} /></label>
      <label className="block">Pull request title<input className={inputClass} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <Button type="submit" value="write" disabled={busy || !sessionToken || !token || !title.trim()}>Commit and open pull request</Button>
      {error && <p role="alert">{error}</p>}
      {pull && <p role="status"><a href={pull} target="_blank" rel="noreferrer" className="underline">View opened pull request</a></p>}
    </form>
  );
}
