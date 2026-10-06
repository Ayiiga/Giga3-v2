/**
 * Automatic marketplace creator verification — format and location checks only.
 * Does not verify ID documents against a government database.
 */

export type CreatorVerificationInput = {
  nationalIdNumber: string;
  latitude: number;
  longitude: number;
  locationAccuracyMeters?: number;
  hasIdDocument: boolean;
};

export type CreatorVerificationResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Ghana approximate bounding box (continental + major islands). */
export const GHANA_BOUNDS = {
  minLat: 4.5,
  maxLat: 11.5,
  minLng: -3.5,
  maxLng: 1.5,
} as const;

/** Reject coarse GPS fixes that are unlikely to reflect the seller's location. */
export const MAX_LOCATION_ACCURACY_METERS = 25_000;

export function normalizeNationalId(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Ghana Card (GHA-XXXXXXXXX-X) and legacy alphanumeric IDs. */
export function isValidNationalId(id: string): boolean {
  const normalized = normalizeNationalId(id);
  if (normalized.length < 5 || normalized.length > 24) return false;
  if (/^GHA-?\d{9}-?\d$/.test(normalized)) return true;
  return /^[A-Z0-9-]+$/.test(normalized);
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function isWithinGhana(lat: number, lng: number): boolean {
  return (
    lat >= GHANA_BOUNDS.minLat &&
    lat <= GHANA_BOUNDS.maxLat &&
    lng >= GHANA_BOUNDS.minLng &&
    lng <= GHANA_BOUNDS.maxLng
  );
}

export function isAcceptableLocationAccuracy(meters: number | undefined): boolean {
  if (meters == null || !Number.isFinite(meters)) return true;
  return meters > 0 && meters <= MAX_LOCATION_ACCURACY_METERS;
}

export function evaluateCreatorVerification(
  input: CreatorVerificationInput
): CreatorVerificationResult {
  const nationalIdNumber = normalizeNationalId(input.nationalIdNumber);

  if (!input.hasIdDocument) {
    return { ok: false, reason: "Upload a photo or scan of your national ID." };
  }
  if (!isValidNationalId(nationalIdNumber)) {
    return {
      ok: false,
      reason:
        "Enter a valid Ghana national ID (for example GHA-123456789-0 or your legacy ID number).",
    };
  }
  if (!isValidCoordinate(input.latitude, input.longitude)) {
    return { ok: false, reason: "Invalid GPS coordinates. Capture your location again." };
  }
  if (!isWithinGhana(input.latitude, input.longitude)) {
    return {
      ok: false,
      reason:
        "GPS location must be within Ghana. Enable location services and capture again outdoors if needed.",
    };
  }
  if (!isAcceptableLocationAccuracy(input.locationAccuracyMeters)) {
    return {
      ok: false,
      reason: `GPS accuracy is too coarse (max ${MAX_LOCATION_ACCURACY_METERS / 1000} km). Try again with a clearer signal.`,
    };
  }

  return { ok: true };
}
