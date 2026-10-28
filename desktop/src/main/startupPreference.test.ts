import { describe, expect, it, vi } from 'vitest';
import { initializeStartupPreference, updateStartupPreference } from './startupPreference';

function setup(stored?: boolean) {
  const read = vi.fn(async () => stored);
  const write = vi.fn(async (_enabled: boolean) => undefined);
  const setLoginItem = vi.fn();
  return { read, write, setLoginItem, options: { platform: 'win32', isPackaged: true, read, write, setLoginItem } as const };
}

describe('startup preference', () => {
  it('enables launch at sign-in by default for a packaged Windows install', async () => {
    const state = setup();
    await initializeStartupPreference(state.options);
    expect(state.setLoginItem).toHaveBeenCalledWith({ openAtLogin: true, enabled: true });
    expect(state.write).toHaveBeenCalledWith(true);
  });

  it('preserves a user opt-out on subsequent starts', async () => {
    const state = setup(false);
    await initializeStartupPreference(state.options);
    expect(state.setLoginItem).not.toHaveBeenCalled();
    expect(state.write).not.toHaveBeenCalled();
  });

  it('does not override the choice made in Windows Startup Apps on later launches', async () => {
    const state = setup(true);
    await initializeStartupPreference(state.options);
    expect(state.setLoginItem).not.toHaveBeenCalled();
  });

  it('persists changes made from app settings', async () => {
    const state = setup();
    await updateStartupPreference(false, state.options);
    expect(state.setLoginItem).toHaveBeenCalledWith({ openAtLogin: false, enabled: true });
    expect(state.write).toHaveBeenCalledWith(false);
  });

  it('does not register startup from development or unsupported platforms', async () => {
    const state = setup();
    const result = await initializeStartupPreference({ ...state.options, platform: 'linux' });
    expect(result.supported).toBe(false);
    expect(state.setLoginItem).not.toHaveBeenCalled();
  });
});
