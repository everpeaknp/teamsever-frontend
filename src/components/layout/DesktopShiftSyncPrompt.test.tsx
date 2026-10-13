import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopShiftSyncPrompt } from './DesktopShiftSyncPrompt';
import { ensureTrustedDesktopDevice } from '@/lib/desktopAttendance';

const { toastMock, dismissToastMock } = vi.hoisted(() => ({ toastMock: vi.fn(), dismissToastMock: vi.fn() }));

vi.mock('@/lib/desktopAttendance', () => ({
  ensureTrustedDesktopDevice: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: Object.assign(toastMock, {
  dismiss: dismissToastMock,
  loading: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}) }));

const trustedDevice = { deviceId: 'device-1', capabilities: { platform: 'win32', foregroundMonitoringSupported: true, idleDetectionSupported: true } } as any;
const getStatus = vi.fn();
const attachPresenceToActiveShift = vi.fn();

describe('DesktopShiftSyncPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureTrustedDesktopDevice).mockResolvedValue(trustedDevice);
    getStatus.mockResolvedValue({ clockedIn: true, clockedInOnThisDevice: false, presenceTrackingActive: false, clockInSource: 'mobile', workspaceId: 'workspace-1', timeEntryId: 'entry-1', activityMonitoringEnabled: false, canAttachPresence: true });
    attachPresenceToActiveShift.mockResolvedValue({ attached: true });
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: {
      getStatus,
      attachPresenceToActiveShift,
    } });
  });

  it('automatically attaches the trusted desktop to an eligible mobile shift', async () => {
    render(<DesktopShiftSyncPrompt />);

    await waitFor(() => expect(attachPresenceToActiveShift).toHaveBeenCalledOnce());
    expect(attachPresenceToActiveShift).toHaveBeenCalledOnce();
    expect(toastMock).not.toHaveBeenCalled();
    expect(ensureTrustedDesktopDevice).toHaveBeenCalledOnce();
  });

  it('shows no consent or confirmation prompt while auto-attaching', async () => {
    render(<DesktopShiftSyncPrompt />);
    await waitFor(() => expect(attachPresenceToActiveShift).toHaveBeenCalledOnce());
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('does not notify if the server cannot confirm the same network', async () => {
    getStatus.mockResolvedValue({ clockedIn: true, clockedInOnThisDevice: false, presenceTrackingActive: false, clockInSource: 'mobile', workspaceId: 'workspace-1', timeEntryId: 'entry-1', activityMonitoringEnabled: false, canAttachPresence: false });
    render(<DesktopShiftSyncPrompt />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(attachPresenceToActiveShift).not.toHaveBeenCalled();
  });

  it('does not pair a browser-started shift even when the public network matches', async () => {
    getStatus.mockResolvedValue({ clockedIn: true, clockedInOnThisDevice: false, presenceTrackingActive: false, clockInSource: 'web', workspaceId: 'workspace-1', timeEntryId: 'entry-1', activityMonitoringEnabled: false, canAttachPresence: true });
    render(<DesktopShiftSyncPrompt />);
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(attachPresenceToActiveShift).not.toHaveBeenCalled();
  });
});
