import { describe, expect, it, vi } from 'vitest';
import { createGeolocationPermissionHandler } from './desktopPermissions';

describe('desktop geolocation permission', () => {
  it('asks once for the trusted app origin and caches an allow decision', async () => {
    const prompt = vi.fn().mockResolvedValue(true);
    const handler = createGeolocationPermissionHandler('https://app.teamsever.com', prompt);
    const ask = (requestingUrl: string, permission = 'geolocation') => new Promise<boolean>((resolve) => {
      handler({ requestingUrl, permission }, resolve);
    });

    await expect(ask('https://app.teamsever.com/attendance')).resolves.toBe(true);
    await expect(ask('https://app.teamsever.com/profile')).resolves.toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it('shares one native prompt between concurrent geolocation requests', async () => {
    let resolvePrompt!: (allowed: boolean) => void;
    const prompt = vi.fn(() => new Promise<boolean>((resolve) => { resolvePrompt = resolve; }));
    const handler = createGeolocationPermissionHandler('https://app.teamsever.com', prompt);
    const request = () => new Promise<boolean>((resolve) => handler({ requestingUrl: 'https://app.teamsever.com', permission: 'geolocation' }, resolve));

    const first = request();
    const second = request();
    expect(prompt).toHaveBeenCalledTimes(1);
    resolvePrompt(true);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });

  it('caches deny and does not prompt for untrusted or malformed origins', async () => {
    const prompt = vi.fn().mockResolvedValue(false);
    const handler = createGeolocationPermissionHandler('https://app.teamsever.com', prompt);
    const ask = (requestingUrl: string, permission = 'geolocation') => new Promise<boolean>((resolve) => {
      handler({ requestingUrl, permission }, resolve);
    });

    await expect(ask('https://evil.example')).resolves.toBe(false);
    await expect(ask('not a url')).resolves.toBe(false);
    await expect(ask('https://app.teamsever.com')).resolves.toBe(false);
    await expect(ask('https://app.teamsever.com', 'notifications')).resolves.toBe(false);
    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
