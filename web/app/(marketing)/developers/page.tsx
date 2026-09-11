import { Container } from "@/components/ui/Container";
import { DeveloperApiKeysPanel } from "@/components/developer/DeveloperApiKeysPanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildUserDeveloperApiUrl } from "@/lib/developer/userApi";
import { buildGigaSocialDeveloperApiUrl } from "@/lib/gigasocial/developerApi";
import { BulletList, Prose } from "@/components/seo/SeoArticleParts";
import { publicMetadata } from "@/lib/seo/publicMetadata";
import { siteConfig } from "@/lib/site";

export const metadata = publicMetadata({
  path: "/developers",
  title: "Developer APIs — Giga3 AI",
  description:
    "GigaSocial read-only HTTP API and Premium user API keys on Giga3 AI. Documented endpoints only — no undocumented routes.",
});

const GIGASOCIAL_ENDPOINTS = [
  {
    method: "GET",
    path: "/health",
    auth: false,
    description: "API liveness and endpoint list (no key required).",
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

const USER_API_ENDPOINTS = [
  {
    method: "GET",
    path: "/health",
    auth: true,
    description: "Key validation and scope discovery for your user API key.",
  },
  {
    method: "GET",
    path: "/me",
    auth: true,
    description: "Returns your user id, key prefix, and granted scopes (requires chat:read scope).",
  },
] as const;

export default function DevelopersPage() {
  const gigaSocialBase = buildGigaSocialDeveloperApiUrl("health").replace(/\/health$/, "");
  const userApiBase = buildUserDeveloperApiUrl("health").replace(/\/health$/, "");

  return (
    <>
      <JsonLd
        breadcrumbs={[
          { name: "Giga3 AI", path: "/" },
          { name: "Developer API", path: "/developers" },
        ]}
      />
      <div className="marketing-stable bg-white">
        <Container className="section-padding">
          <div className="mx-auto max-w-3xl">
            <h1 className="page-title">Developer APIs on Giga3</h1>
            <p className="section-lead mt-4">
              Two separate HTTP surfaces on {siteConfig.name}: a read-only GigaSocial integration
              API (platform key) and a Premium user API (per-account keys). Only the endpoints listed
              below are live today.
            </p>

            <section className="mt-12 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">GigaSocial read API</h2>
              <p className="text-base text-muted">
                Read-only GET routes for public GigaSocial content — feeds, posts, profiles, and
                comments. Intended for dashboards, research tools, and integrations.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Base URL</h3>
              <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
                {gigaSocialBase}
              </pre>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Authentication</h3>
              <p className="text-base text-muted">
                Protected routes require a platform API key configured on the Convex deployment as{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                  GIGASOCIAL_DEVELOPER_API_KEY
                </code>
                . Pass it on every request using either header:
              </p>
              <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
{`Authorization: Bearer YOUR_PLATFORM_KEY
# or
X-Giga3-Api-Key: YOUR_PLATFORM_KEY`}
              </pre>
              <p className="text-sm text-muted">
                Rate limit: 120 requests per hour per key. Contact{" "}
                <a href={`mailto:${siteConfig.contact.email}`} className="text-accent hover:underline">
                  {siteConfig.contact.email}
                </a>{" "}
                to request a production platform key.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Endpoints</h3>
              <div className="space-y-4">
                {GIGASOCIAL_ENDPOINTS.map((endpoint) => (
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
                        <span className="text-xs text-muted">Platform key required</span>
                      ) : (
                        <span className="text-xs text-green-700">Public</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Example — public feed</h3>
              <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
{`curl -s \\
  -H "Authorization: Bearer YOUR_PLATFORM_KEY" \\
  "${buildGigaSocialDeveloperApiUrl("feed", { limit: 5 })}"`}
              </pre>
            </section>

            <section className="mt-16 space-y-4 border-t border-border pt-12">
              <h2 className="text-xl font-semibold text-foreground">Premium user API</h2>
              <p className="text-base text-muted">
                Active Premium subscribers can create personal API keys (hashed server-side, max 5
                active keys). Today only <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">GET /api/v1/health</code>{" "}
                and <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">GET /api/v1/me</code>{" "}
                are implemented. Additional scopes (chat write, GigaLearn, media read) are reserved
                for future routes — not available yet.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Base URL</h3>
              <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
                {userApiBase}
              </pre>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Authentication</h3>
              <p className="text-base text-muted">
                Pass your user key (prefix <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">giga3_sk_…</code>
                ) via <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">Authorization: Bearer</code>{" "}
                or <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">X-Giga3-Api-Key</code>.
                Keys require an active Premium subscription (<code>api_access</code> entitlement).
                Create keys below when signed in with Premium — scopes beyond{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">chat:read</code> are
                reserved for future routes.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Live endpoints</h3>
              <div className="space-y-4">
                {USER_API_ENDPOINTS.map((endpoint) => (
                  <div
                    key={`user-${endpoint.path}`}
                    className="saas-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800">
                        {endpoint.method}
                      </span>
                      <code className="text-sm text-foreground">{endpoint.path}</code>
                      <span className="text-xs text-muted">User key required</span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="user-api-keys" className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Manage your API keys</h3>
              <DeveloperApiKeysPanel />
            </section>

            <section className="mt-8 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Example — verify key</h3>
              <pre className="overflow-x-auto rounded-xl border border-border bg-slate-50 p-4 text-sm">
{`curl -s \\
  -H "Authorization: Bearer giga3_sk_YOUR_KEY" \\
  "${buildUserDeveloperApiUrl("me")}"`}
              </pre>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Security &amp; privacy</h2>
              <BulletList
                items={[
                  "GigaSocial routes are read-only GET — no writes through either API surface.",
                  "Only public GigaSocial posts and profiles are returned; followers-only content is omitted.",
                  "Never embed platform or user API keys in client apps, PWAs, or public repos.",
                  "GigaSocial platform keys: 120 requests/hour. User keys: usage tracked per key/day on the server.",
                  "Use HTTPS only. Revoke compromised user keys via apiKeys.revokeKey when signed in.",
                ]}
              />
              <Prose>
                Both APIs are served from the Convex site URL above. A dedicated hostname (for example{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">api.giga3ai.com</code>
                ) would require infrastructure changes — the documented paths are the supported base today.
              </Prose>
            </section>

            <section className="mt-10 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">GigaSocial error codes</h2>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold">HTTP</th>
                      <th className="px-4 py-3 font-semibold">code</th>
                      <th className="px-4 py-3 font-semibold">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["401", "unauthorized", "Missing or invalid platform API key"],
                      ["404", "not_found", "Post, profile, or resource not public"],
                      ["429", "rate_limited", "Hourly quota exceeded — back off and retry"],
                      ["503", "api_not_configured", "GigaSocial developer API disabled on this deployment"],
                    ].map(([http, code, meaning]) => (
                      <tr key={code} className="border-t border-border">
                        <td className="px-4 py-3">{http}</td>
                        <td className="px-4 py-3">
                          <code>{code}</code>
                        </td>
                        <td className="px-4 py-3 text-muted">{meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-10 rounded-2xl border border-border bg-slate-50 p-4 text-sm text-muted">
              <p>
                GigaSocial responses use JSON with <code>ok: true</code> on success. User API
                responses return <code>ok: true</code> with your user id and scopes on{" "}
                <code>/me</code>, or <code>ok: false</code> with an error message when the key is
                missing, revoked, or lacks the required scope.
              </p>
            </section>
          </div>
        </Container>
      </div>
    </>
  );
}
