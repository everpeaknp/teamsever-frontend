import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MobileShiftSyncPrompt } from './MobileShiftSyncPrompt';
import { ensureTrustedDesktopDevice, getDesktopPresencePreference } from '@/lib/desktopAttendance';

vi.mock('@/lib/desktopAttendance', () => ({ ensureTrustedDesktopDevice: vi.fn(), getDesktopPresencePreference: vi.fn() }));

describe('MobileShiftSyncPrompt', () => {
  const respondToMobileShift = vi.fn();
  const dismissedShiftKey = 'teamsever:desktop:dismissed-mobile-shift';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDesktopPresencePreference).mockResolvedValue(true);
    vi.mocked(ensureTrustedDesktopDevice).mockResolvedValue({ deviceId: 'device-1', capabilities: {} as any });
    window.localStorage.clear();
    Object.defineProperty(window, 'teamseverDesktop', {
      configurable: true,
      value: {
        getStatus: vi.fn().mockResolvedValue({
          clockedIn: true,
          clockedInOnThisDevice: false,
          presenceTrackingActive: false,
          clockInSource: 'mobile',
          workspaceId: 'workspace-1',
          timeEntryId: 'entry-1',
          startTime: '2026-10-18T09:00:00.000Z',
          activityMonitoringEnabled: true,
          pendingMobileShift: {
            timeEntryId: 'entry-1',
            workspaceId: 'workspace-1',
            startTime: '2026-10-18T09:00:00.000Z',
          },
        }),
        respondToMobileShift,
      },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('shows the in-app sync choices and submits the selected action', async () => {
    respondToMobileShift.mockResolvedValue({ synced: true, alwaysSync: true });
    render(<MobileShiftSyncPrompt />);

    expect(await screen.findByRole('heading', { name: 'Mobile shift found' })).toBeInTheDocument();
    expect(ensureTrustedDesktopDevice).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/foreground app names and active\/AFK state/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Always sync future mobile shifts' }));

    await waitFor(() => expect(respondToMobileShift).toHaveBeenCalledWith('entry-1', 'always'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mobile shift found' })).not.toBeInTheDocument());
  });

  it('provisions a fresh trusted device before reading status', async () => {
    render(<MobileShiftSyncPrompt />);

    await waitFor(() => expect(window.teamseverDesktop!.getStatus).toHaveBeenCalled());
    expect(ensureTrustedDesktopDevice).toHaveBeenCalledTimes(1);
    expect(vi.mocked(ensureTrustedDesktopDevice).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(window.teamseverDesktop!.getStatus as any).mock.invocationCallOrder[0],
    );
  });

  it('does not provision or show a prompt when desktop presence is disabled', async () => {
    vi.mocked(getDesktopPresencePreference).mockResolvedValue(false);
    render(<MobileShiftSyncPrompt />);

    await waitFor(() => expect(getDesktopPresencePreference).toHaveBeenCalled());
    expect(ensureTrustedDesktopDevice).not.toHaveBeenCalled();
    expect(window.teamseverDesktop!.getStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Mobile shift found' })).not.toBeInTheDocument();
  });

  it('retries provisioning after a recoverable error', async () => {
    vi.useFakeTimers();
    vi.mocked(ensureTrustedDesktopDevice)
      .mockRejectedValueOnce(new Error('temporary provisioning failure'))
      .mockResolvedValue({ deviceId: 'device-1', capabilities: {} as any });
    render(<MobileShiftSyncPrompt />);

    await vi.waitFor(() => expect(ensureTrustedDesktopDevice).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(15_000);
    await vi.waitFor(() => expect(ensureTrustedDesktopDevice).toHaveBeenCalledTimes(2));
    expect(window.teamseverDesktop!.getStatus).toHaveBeenCalledTimes(1);
  });

  it('does not show a shift dismissed by the in-app prompt again after reload', async () => {
    window.localStorage.setItem(dismissedShiftKey, 'entry-1');
    render(<MobileShiftSyncPrompt />);

    await waitFor(() => expect(window.teamseverDesktop!.getStatus).toHaveBeenCalled());
    expect(screen.queryByRole('heading', { name: 'Mobile shift found' })).not.toBeInTheDocument();
  });

  it('persists a Not now choice for the current shift', async () => {
    respondToMobileShift.mockResolvedValue({ synced: false });
    render(<MobileShiftSyncPrompt />);

    expect(await screen.findByRole('heading', { name: 'Mobile shift found' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));

    await waitFor(() => expect(respondToMobileShift).toHaveBeenCalledWith('entry-1', 'not_now'));
    await waitFor(() => expect(window.localStorage.getItem(dismissedShiftKey)).toBe('entry-1'));
  });
});
