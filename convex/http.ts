import { httpRouter } from "convex/server";
import {
  gigaSocialDeveloperApiComments,
  gigaSocialDeveloperApiDiscover,
  gigaSocialDeveloperApiFeed,
  gigaSocialDeveloperApiHealth,
  gigaSocialDeveloperApiPost,
  gigaSocialDeveloperApiProfile,
} from "./gigaSocialDeveloperApi";
import { gigaSocialPostOgImage } from "./gigaSocialPostOgImage";
import { gigaSocialPostPreview } from "./gigaSocialPostPreview";
import { healthCheck } from "./health";
import { paystackWebhook } from "./paystack";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: healthCheck,
});

http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: paystackWebhook,
});

http.route({
  path: "/gigasocial/post/preview",
  method: "GET",
  handler: gigaSocialPostPreview,
});

http.route({
  path: "/gigasocial/post/og-image",
  method: "GET",
  handler: gigaSocialPostOgImage,
});

http.route({
  path: "/gigasocial/api/v1/health",
  method: "GET",
  handler: gigaSocialDeveloperApiHealth,
});

http.route({
  path: "/gigasocial/api/v1/post",
  method: "GET",
  handler: gigaSocialDeveloperApiPost,
});

http.route({
  path: "/gigasocial/api/v1/feed",
  method: "GET",
  handler: gigaSocialDeveloperApiFeed,
});

http.route({
  path: "/gigasocial/api/v1/discover",
  method: "GET",
  handler: gigaSocialDeveloperApiDiscover,
});

http.route({
  path: "/gigasocial/api/v1/profile",
  method: "GET",
  handler: gigaSocialDeveloperApiProfile,
});

http.route({
  path: "/gigasocial/api/v1/comments",
  method: "GET",
  handler: gigaSocialDeveloperApiComments,
});

export default http;
