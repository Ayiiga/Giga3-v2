import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import courses from "../../public/gigalearn/academy/workspace/courses.mjs";

const getActiveSubscription = makeFunctionReference("subscriptions:getActiveSubscription");
const productionConvexUrl = "https://perfect-lark-521.convex.cloud";
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function onRequestPost({ request, env }) {
  const token = request.headers.get("Authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token || token.length > 4096) return new Response(null, { status: 401, headers: privateHeaders });
  let input;
  try {
    input = await request.json();
  } catch {
    return new Response(null, { status: 400, headers: privateHeaders });
  }
  const course = courses.find((item) => item.id === input?.course);
  if (!course || !["access", "download", "print"].includes(input.action)) {
    return new Response(null, { status: 400, headers: privateHeaders });
  }

  let subscription;
  try {
    const convex = new ConvexHttpClient(env?.ACADEMY_CONVEX_URL || productionConvexUrl, { logger: false });
    convex.setFetchOptions({ signal: AbortSignal.timeout(8000) });
    subscription = await convex.query(getActiveSubscription, { sessionToken: token });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
  if (subscription?.status !== "active" || !Number.isFinite(subscription.periodEnd) || subscription.periodEnd <= Date.now()) {
    return new Response(null, { status: 403, headers: privateHeaders });
  }
  if (input.action === "access") return new Response(null, { status: 204, headers: privateHeaders });

  const [title, type, steps] = course.material;
  const worksheet = [
    "GigaLearn Academy", course.name, "", title, type, "",
    ...steps.map((step, index) => `${index + 1}. ${step}`),
  ].join("\n");
  return new Response(worksheet, {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...(input.action === "download" && {
        "Content-Disposition": `attachment; filename="gigalearn-${course.id}-worksheet.txt"`,
      }),
    },
  });
}
