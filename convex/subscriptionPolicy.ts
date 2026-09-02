/**
 * Legacy grandfathered account — used only by the one-off
 * `revokeLegacySubscribersExceptGrandfathered` migration to preserve existing
 * paid access. It does NOT restrict new checkouts: once that access expires the
 * account buys plans like any other user.
 */
export const GRANDFATHERED_SUBSCRIBER_EMAIL = "ayiiga3@gmail.com";

export function normalizeSubscriberEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isGrandfatheredSubscriber(email: string): boolean {
  return normalizeSubscriberEmail(email) === GRANDFATHERED_SUBSCRIBER_EMAIL;
}
