import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { AppUpdateNotifier } from './AppUpdateNotifier';

vi.mock('sonner', () => ({ toast: vi.fn() }));

describe('AppUpdateNotifier', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('shows one refresh toast when the deployed build changes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'new-build' }),
    }));

    render(<AppUpdateNotifier currentBuildId="old-build" pollIntervalMs={60_000} />);

    await waitFor(() => expect(toast).toHaveBeenCalledWith(
      'TeamsEver has been updated',
      expect.objectContaining({
        description: 'Refresh to load the latest version.',
        duration: Infinity,
        action: expect.objectContaining({ label: 'Refresh', onClick: expect.any(Function) }),
      }),
    ));
  });

  it('does not show a toast when the deployed build matches the loaded app', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: 'same-build' }),
    }));

    render(<AppUpdateNotifier currentBuildId="same-build" pollIntervalMs={60_000} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(toast).not.toHaveBeenCalled();
  });

  it('does not report an update when the version endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    render(<AppUpdateNotifier currentBuildId="old-build" pollIntervalMs={60_000} />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(toast).not.toHaveBeenCalled();
  });
});
