import { afterEach, describe, expect, it, vi } from 'vitest';
import { readAccurateLocation } from './readAccurateLocation';

function geolocationWithTimestamp(timestamp: number): Geolocation {
  return {
    watchPosition: vi.fn((success) => {
      success({
        timestamp,
        coords: { latitude: 27.7, longitude: 85.3, accuracy: 12 },
      } as GeolocationPosition);
      return 1;
    }),
    clearWatch: vi.fn(),
  } as unknown as Geolocation;
}

describe('readAccurateLocation freshness', () => {
  afterEach(() => vi.useRealTimers());

  it('ignores stale browser fixes and explains the failure after the reading window', async () => {
    vi.useFakeTimers();
    const geolocation = geolocationWithTimestamp(Date.now() - 31_000);
    const result = readAccurateLocation(50, geolocation, 1_000);
    const rejected = expect(result).rejects.toMatchObject({ name: 'StaleLocationError' });

    await vi.advanceTimersByTimeAsync(1_000);
    await rejected;
    expect(geolocation.clearWatch).toHaveBeenCalledWith(1);
  });

  it('accepts a fresh fix that meets the accuracy threshold', async () => {
    const geolocation = geolocationWithTimestamp(Date.now());

    await expect(readAccurateLocation(50, geolocation)).resolves.toMatchObject({
      latitude: 27.7,
      longitude: 85.3,
      accuracyMeters: 12,
    });
  });
});
