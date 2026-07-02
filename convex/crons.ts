import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "expire subscriptions and downgrade to free",
  { hourUTC: 3, minuteUTC: 0 },
  internal.subscriptions.expireStaleSubscriptions,
  {}
);

// Safety net so chat never stays stuck: reschedule/finalize orphaned reply jobs.
crons.interval(
  "recover stuck chat reply jobs",
  { seconds: 60 },
  internal.chatReplyRecovery.recoverStuckJobs,
  {}
);

export default crons;
