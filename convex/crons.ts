import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "expire subscriptions and downgrade to free",
  { hourUTC: 3, minuteUTC: 0 },
  internal.subscriptions.expireStaleSubscriptions,
  {}
);

export default crons;
