import { httpRouter } from "convex/server";
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

export default http;
