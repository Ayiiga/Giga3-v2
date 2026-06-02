import { httpRouter } from "convex/server";
import { paystackWebhook } from "./paystack";

const http = httpRouter();

http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: paystackWebhook,
});

export default http;
