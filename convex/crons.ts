import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Charge saved cards for periods ending within 2 days (runs before the expiry sweep).
crons.daily(
  "renew subscriptions via saved payment methods",
  { hourUTC: 2, minuteUTC: 0 },
  internal.subscriptionRenewal.processDueRenewals,
  {}
);

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

crons.daily(
  "refresh live news cache",
  { hourUTC: 5, minuteUTC: 30 },
  internal.liveNews.refreshLiveNewsCache,
  {}
);

crons.daily(
  "sports live score push digest",
  { hourUTC: 18, minuteUTC: 0 },
  internal.sportsScores.notifyLiveSportsDigest,
  {}
);

crons.interval(
  "retry queued push notifications",
  { minutes: 5 },
  internal.pushNotificationDispatch.processPushQueue,
  {}
);

// Daily re-engagement emails (create / learn / entertain / GigaSocial) for inactive opted-in users.
// Still occasional per user via minDaysSinceLastEmail.
crons.daily(
  "engagement email digests",
  { hourUTC: 15, minuteUTC: 0 },
  internal.engagementEmailActions.sendEngagementDigests,
  { limit: 50, minInactiveDays: 2, minDaysSinceLastEmail: 4 }
);

// Weekly branded product-update email for opted-in users (respects unsubscribe + 12-day gap).
crons.weekly(
  "feature announcement emails",
  { dayOfWeek: "monday", hourUTC: 14, minuteUTC: 0 },
  internal.engagementEmailActions.sendFeatureAnnouncementEmails,
  { limit: 40, minDaysSinceLastEmail: 12 }
);

export default crons;
