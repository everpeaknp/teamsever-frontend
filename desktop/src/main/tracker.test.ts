import { describe, expect, it } from 'vitest';
import { canMonitorForegroundApps, classifyPresence, detectPresenceCapabilities, normalizeAppId } from './tracker';
import { foregroundAppSupport, windowsProcessNameScript } from './foregroundProcess';

describe('foreground app tracker privacy and platform behavior', () => {
  it('does not expose window titles or unsafe process text as app identity', () => {
    expect(normalizeAppId('Visual Studio Code.exe')).toBe('visual-studio-code.exe');
    expect(normalizeAppId('Project: payroll.xlsx')).toBeNull();
  });

  it('runs only with opt-in, a desktop shift, and a supported session', () => {
    expect(canMonitorForegroundApps({ enabled: true, clockedIn: true, platform: 'win32', wayland: false })).toBe(true);
    expect(canMonitorForegroundApps({ enabled: false, clockedIn: true, platform: 'win32', wayland: false })).toBe(false);
    expect(canMonitorForegroundApps({ enabled: true, clockedIn: false, platform: 'win32', wayland: false })).toBe(false);
    expect(canMonitorForegroundApps({ enabled: true, clockedIn: true, platform: 'linux', wayland: true })).toBe(false);
  });

  it('uses a process-name-only Windows query and reports Wayland as unavailable', async () => {
    expect(windowsProcessNameScript).toContain('[DllImport("user32.dll")]');
    expect(windowsProcessNameScript).not.toMatch(/GetWindowText|windowTitle/i);
    await expect(foregroundAppSupport('win32')).resolves.toEqual({ supported: true });
    await expect(foregroundAppSupport('linux', true)).resolves.toMatchObject({ supported: false, reason: expect.stringContaining('Wayland') });
  });
});

describe('idle-based presence classification', () => {
  it('reports active below the configured idle threshold', () => {
    expect(classifyPresence(299, 5)).toBe('active');
  });

  it('reports AFK at or above the configured idle threshold and active again after input', () => {
    expect(classifyPresence(300, 5)).toBe('afk');
    expect(classifyPresence(0, 5)).toBe('active');
  });

  it('reports unavailable instead of guessing when the idle source is absent or invalid', () => {
    expect(classifyPresence(null, 5)).toBe('unavailable');
    expect(classifyPresence(Number.NaN, 5)).toBe('unavailable');
    expect(classifyPresence(-1, 5)).toBe('unavailable');
  });

  it('keeps foreground app and idle detection capabilities independent', async () => {
    await expect(detectPresenceCapabilities(
      async () => ({ supported: false, reason: 'Wayland is unavailable' }),
      () => 0,
    )).resolves.toEqual({
      foregroundApp: { supported: false, reason: 'Wayland is unavailable' },
      idleDetection: { supported: true },
    });

    await expect(detectPresenceCapabilities(
      async () => ({ supported: true }),
      () => { throw new Error('idle API unavailable'); },
    )).resolves.toEqual({
      foregroundApp: { supported: true },
      idleDetection: { supported: false, reason: 'System idle detection is unavailable.' },
    });
  });

  it('returns only a status string and does not produce input counts', () => {
    const status = classifyPresence(0, 5);
    expect(status).toBe('active');
    expect(typeof status).toBe('string');
  });
});