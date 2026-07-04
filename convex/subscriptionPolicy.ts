/** Grandfathered account — keeps existing paid access; blocked from new checkout. */
export const GRANDFATHERED_SUBSCRIBER_EMAIL = "ayiiga3@gmail.com";

export function normalizeSubscriberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isGrandfatheredSubscriber(email: string): boolean {
  return normalizeSubscriberEmail(email) === GRANDFATHERED_SUBSCRIBER_EMAIL;
}

/** Emails that cannot start a new subscription checkout (grandfathered only). */
export function isBlockedFromNewSubscription(email: string): boolean {
  return isGrandfatheredSubscriber(email);
}

export const SUBSCRIPTION_CHECKOUT_BLOCKED_MESSAGE =
  "This account already has grandfathered access and cannot purchase a new subscription.";
