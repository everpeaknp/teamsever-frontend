export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

/** Collect fixes until one meets policy or the provider's best reading window expires. */
export function readAccurateLocation(
  maxAccuracyMeters: number,
  geolocation: Geolocation = navigator.geolocation,
  timeoutMs = 20_000,
): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    let bestFix: LocationFix | undefined;
    let watchId: number | undefined;
    let settled = false;

    const finish = (fix?: LocationFix, error?: GeolocationPositionError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      if (fix) resolve(fix);
      else reject(error || new Error('Location is unavailable or permission was denied.'));
    };

    const timer = setTimeout(() => finish(bestFix), timeoutMs);
    try {
      watchId = geolocation.watchPosition(
        (position) => {
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
