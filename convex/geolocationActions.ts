"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { requireSessionWithMonitoring } from "./auth";

export type ReverseGeocodeResult = {
  formattedAddress: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  accuracyMeters?: number;
  mapUrl: string;
  provider: "nominatim";
  retrievedAt: number;
};

function validateCoordinates(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Invalid coordinates.");
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordinates out of range.");
  }
}

function buildFormattedAddress(parts: {
  city?: string;
  region?: string;
  country?: string;
}): string {
  return [parts.city, parts.region, parts.country].filter(Boolean).join(", ");
}

/** Reverse-geocode device coordinates via OpenStreetMap Nominatim (no client API key). */
export const reverseGeocode = action({
  args: {
    sessionToken: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    accuracyMeters: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    await requireSessionWithMonitoring(args.sessionToken, _ctx, "geolocation.reverseGeocode");
    validateCoordinates(args.latitude, args.longitude);

    const lat = args.latitude;
    const lng = args.longitude;
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "14");
    url.searchParams.set("addressdetails", "1");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Giga3AI/1.0 (+https://www.giga3ai.com; location reverse-geocode)",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Location lookup is temporarily unavailable.");
      }

      const data = (await res.json()) as {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          suburb?: string;
          state?: string;
          region?: string;
          country?: string;
          country_code?: string;
        };
      };

      const address = data.address ?? {};
      const city =
        address.city ??
        address.town ??
        address.village ??
        address.suburb ??
        undefined;
      const region = address.state ?? address.region;
      const country = address.country;
      const formattedAddress =
        buildFormattedAddress({ city, region, country }) ||
        data.display_name?.slice(0, 240) ||
        "Approximate location found";

      const result: ReverseGeocodeResult = {
        formattedAddress,
        city,
        region,
        country,
        countryCode: address.country_code?.toUpperCase(),
        accuracyMeters: args.accuracyMeters,
        mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`,
        provider: "nominatim",
        retrievedAt: Date.now(),
      };
      return result;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Location lookup timed out. Please try again.");
      }
      throw err instanceof Error
        ? err
        : new Error("Location lookup failed.");
    } finally {
      clearTimeout(timer);
    }
  },
});
