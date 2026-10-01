import { describe, expect, it, vi } from 'vitest';
import { DesktopUpdaterController, type DesktopUpdateState } from './desktopUpdater';

type UpdateEvent = 'checking-for-update' | 'update-available' | 'download-progress' | 'update-downloaded' | 'update-not-available' | 'error';

function fixture() {
  const listeners = new Map<UpdateEvent, (value?: any) => void>();
  const updater = {
    on: vi.fn((event: UpdateEvent, listener: (value?: any) => void) => { listeners.set(event, listener); }),
    checkForUpdates: vi.fn(async () => undefined),
    quitAndInstall: vi.fn(),
  };
  let clockedIn = false;
  let statusFails = false;
  const states: DesktopUpdateState[] = [];
  const controller = new DesktopUpdaterController({
    updater,
    getClockedIn: async () => {
      if (statusFails) throw new Error('private auth detail');
      return clockedIn;
    },
    publish: (state) => states.push(state),
  });
  return {
    controller, updater, states,
    emit: (event: UpdateEvent, value?: any) => listeners.get(event)?.(value),
    setClockedIn: (value: boolean) => { clockedIn = value; },
    setStatusFails: (value: boolean) => { statusFails = value; },
  };
}

describe('DesktopUpdaterController', () => {
  it('publishes check, availability, download progress, and downloaded states', async () => {
    const f = fixture();
    await f.controller.checkForUpdates();
    f.emit('update-available', { version: '0.1.5' });
    f.emit('download-progress', { percent: 42.8 });
    f.emit('update-downloaded', { version: '0.1.5' });
    expect(f.states).toEqual([
      { type: 'checking' },
      { type: 'available', version: '0.1.5' },
      { type: 'downloading', percent: 43 },
      { type: 'downloaded', version: '0.1.5' },
    ]);
  });

  it('turns update service errors into a safe state without changing attendance', async () => {
    const f = fixture();
    f.updater.checkForUpdates.mockRejectedValueOnce(new Error('secret credential in URL'));
    await f.controller.checkForUpdates();
    expect(f.states.at(-1)).toEqual({ type: 'error', message: 'Could not check for desktop updates. You can download the latest version manually.' });
    expect(f.updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('defers an update while clocked in, then installs after clock-out is confirmed', async () => {
    const f = fixture();
    f.emit('update-downloaded', { version: '0.1.5' });
    f.setClockedIn(true);
    await expect(f.controller.installDownloadedUpdate()).resolves.toBe(false);
    expect(f.states.at(-1)).toEqual({ type: 'deferred', version: '0.1.5', reason: 'clocked-in' });
    expect(f.updater.quitAndInstall).not.toHaveBeenCalled();

    f.setClockedIn(false);
    await expect(f.controller.installDownloadedUpdate()).resolves.toBe(true);
    expect(f.updater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it('refuses to install when clock status cannot be verified', async () => {
    const f = fixture();
    f.emit('update-downloaded', { version: '0.1.5' });
    f.setStatusFails(true);
    await expect(f.controller.installDownloadedUpdate()).resolves.toBe(false);
    expect(f.states.at(-1)).toEqual({ type: 'deferred', version: '0.1.5', reason: 'status-unavailable' });
    expect(f.updater.quitAndInstall).not.toHaveBeenCalled();
  });

  it('does not install until an update has finished downloading', async () => {
    const f = fixture();
    await expect(f.controller.installDownloadedUpdate()).resolves.toBe(false);
    expect(f.updater.quitAndInstall).not.toHaveBeenCalled();
  });
});
