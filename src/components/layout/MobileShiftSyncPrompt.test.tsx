import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MobileShiftSyncPrompt } from './MobileShiftSyncPrompt';

describe('MobileShiftSyncPrompt', () => {
  const respondToMobileShift = vi.fn();
  const dismissedShiftKey = 'teamsever:desktop:dismissed-mobile-shift';

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('shows the in-app sync choices and submits the selected action', async () => {
    respondToMobileShift.mockResolvedValue({ synced: true, alwaysSync: true });
    render(<MobileShiftSyncPrompt />);

    expect(await screen.findByRole('heading', { name: 'Mobile shift found' })).toBeInTheDocument();
    expect(screen.getByText(/foreground app names and active\/AFK state/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Always sync future mobile shifts' }));

    await waitFor(() => expect(respondToMobileShift).toHaveBeenCalledWith('entry-1', 'always'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Mobile shift found' })).not.toBeInTheDocument());
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
