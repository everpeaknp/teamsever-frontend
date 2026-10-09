export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

const MAX_FIX_AGE_MS = 30_000;
const MAX_FUTURE_SKEW_MS = 15_000;

function staleLocationError() {
  return Object.assign(
    new Error('Could not obtain a fresh location reading. Check your PC date/time and location services, then retry.'),
    { name: 'StaleLocationError' },
  );
}

/** Collect fresh fixes until one meets policy or the provider's reading window expires. */
export function readAccurateLocation(
  maxAccuracyMeters: number,
  geolocation: Geolocation = navigator.geolocation,
  timeoutMs = 20_000,
): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    let bestFix: LocationFix | undefined;
    let watchId: number | undefined;
    let settled = false;

    const finish = (fix?: LocationFix, error?: Error | GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      if (fix) resolve(fix);
      else reject(error || new Error('Location is unavailable or permission was denied.'));
    };

    const timer = setTimeout(() => finish(bestFix, bestFix ? undefined : staleLocationError()), timeoutMs);
    try {
      watchId = geolocation.watchPosition(
        (position) => {
          const ageMs = Date.now() - position.timestamp;
          if (!Number.isFinite(position.timestamp) || ageMs > MAX_FIX_AGE_MS || ageMs < -MAX_FUTURE_SKEW_MS) {
            return;
          }

          const fix = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date(position.timestamp).toISOString(),
          };
          if (!bestFix || fix.accuracyMeters < bestFix.accuracyMeters) bestFix = fix;
          if (fix.accuracyMeters <= maxAccuracyMeters) finish(fix);
        },
        (error) => finish(bestFix, error),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
      // Some test providers and platform shims can invoke the callback synchronously.
      if (settled && watchId !== undefined) geolocation.clearWatch(watchId);
    } catch (error) {
      finish(bestFix);
      if (!bestFix) reject(error);
    }
  });
}
