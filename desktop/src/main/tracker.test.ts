import { describe, expect, it } from 'vitest';
import { canMonitorForegroundApps, normalizeAppId } from './tracker';
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
