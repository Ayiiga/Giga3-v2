export type CapturedCoordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: number;
};

export function captureCoordinates(): Promise<CapturedCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: Date.now(),
        });
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission denied. Allow location access to complete registration.",
          2: "Could not determine your location. Try again outdoors or check GPS.",
          3: "Location request timed out. Please try again.",
        };
        reject(new Error(messages[error.code] ?? "Failed to capture location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  });
}

export function formatCoordinates(lat: number, lng: number, accuracyMeters?: number): string {
  const base = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (accuracyMeters == null) return base;
  return `${base} (±${Math.round(accuracyMeters)} m)`;
}
