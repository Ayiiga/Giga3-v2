import { SOCIAL_BOOST_COUNTRIES } from "../web/lib/gigasocial/boostCountries";
import { v } from "convex/values";

export const socialBoostCountryValidator = v.union(...SOCIAL_BOOST_COUNTRIES.map(({ code }) => v.literal(code)));

export const socialBoostOptions = v.object({
  website: v.optional(v.string()),
  audience: v.union(v.literal("everyone"), v.literal("followers"), v.literal("new_people")),
  country: v.optional(socialBoostCountryValidator),
});

export function normalizeSocialWebsite(input: string | undefined) {
  const value = input?.trim();
  if (!value) return undefined;
  if (value.length > 2048 || /[\s\\]/.test(value)) throw new Error("Enter a valid HTTPS website address.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Enter a valid HTTPS website address."); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
    throw new Error("Enter a valid HTTPS website address.");
  }
  return url.href;
}

export function matchesSocialBoost(
  options: { audience: string; country?: string } | undefined,
  isFollower: boolean,
  country: string | undefined,
) {
  return (!options?.country || options.country === country) &&
    (options?.audience !== "followers" || isFollower) &&
    (options?.audience !== "new_people" || !isFollower);
}
