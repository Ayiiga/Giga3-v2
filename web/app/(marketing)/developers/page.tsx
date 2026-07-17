import { Container } from "@/components/ui/Container";
import { buildGigaSocialDeveloperApiUrl } from "@/lib/gigasocial/developerApi";
import { siteConfig } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer API",
  description:
    "Read-only GigaSocial developer API for feeds, posts, profiles, and comments on Giga3 AI.",
};

const ENDPOINTS = [
  {
    method: "GET",
    path: "/health",
    auth: false,
    description: "API liveness and endpoint list.",
  },
  {
    method: "GET",
    path: "/post?id={postId}",
    auth: true,
    description: "Fetch a single public post by Convex post id.",
  },
  {
    method: "GET",
    path: "/feed?limit=20&cursor=&community=",
    auth: true,
    description: "Paginated public community feed (cursor = createdAt ms).",
  },
  {
    method: "GET",
    path: "/discover?filter=trending&q=&limit=24",
    auth: true,
    description:
      "Discover posts. Filters: trending, recent, education, creator, ai, video, photo, music.",
  },
  {
    method: "GET",
    path: "/profile?handle={handle}",
    auth: true,
    description: "Public creator profile and recent posts by @handle.",
  },
  {
    method: "GET",
    path: "/comments?postId={postId}",
    auth: true,
    description: "List comments on a public post.",
  },
] as const;

export default function DevelopersPage() {
  const apiBase = buildGigaSocialDeveloperApiUrl("health").replace(/\/health$/, "");

  return (
    <div className="marketing-stable bg-white">
      <Container className="section-padding">
        <div className="mx-auto max-w-3xl">
          <h1 className="page-title">GigaSocial Developer API</h1>
          <p className="section-lead mt-4">
            Read-only HTTP API for integrating GigaSocial public content into apps, dashboards,
            and research tools. Built on {siteConfig.name}.
          </p>

          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Base URL</h2>
            <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
              {apiBase}
            </pre>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Authentication</h2>
            <p className="text-base text-muted">
              Protected endpoints require an API key set on the Convex deployment as{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                GIGASOCIAL_DEVELOPER_API_KEY
              </code>
              . Pass it on every request using either header:
            </p>
            <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
{`Authorization: Bearer YOUR_API_KEY
# or
X-Giga3-Api-Key: YOUR_API_KEY`}
            </pre>
            <p className="text-sm text-muted">
              Rate limit: 120 requests per hour per key. Contact{" "}
              <a href={`mailto:${siteConfig.contact.email}`} className="text-accent hover:underline">
                {siteConfig.contact.email}
              </a>{" "}
              to request a production key.
            </p>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Endpoints</h2>
            <div className="space-y-4">
              {ENDPOINTS.map((endpoint) => (
                <div
                  key={endpoint.path}
                  className="saas-card rounded-2xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
                      {endpoint.method}
                    </span>
                    <code className="text-sm text-foreground">{endpoint.path}</code>
                    {endpoint.auth ? (
                      <span className="text-xs text-muted">API key required</span>
                    ) : (
                      <span className="text-xs text-green-700">Public</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Example</h2>
            <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
{`curl -s \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  "${buildGigaSocialDeveloperApiUrl("feed", { limit: 5 })}"`}
            </pre>
          </section>

          <section className="mt-10 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-muted">
            <p>
              Responses are JSON with <code>ok: true</code> on success. Errors return{" "}
              <code>ok: false</code> with an <code>error.code</code> such as{" "}
              <code>unauthorized</code>, <code>rate_limited</code>, or <code>not_found</code>.
              Only public posts and profiles are exposed — followers-only content is omitted.
            </p>
          </section>
        </div>
      </Container>
    </div>
  );
}
