import { httpRouter } from "convex/server";
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

export default http;
