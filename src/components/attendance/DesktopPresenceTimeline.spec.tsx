import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { DesktopPresenceTimeline } from './DesktopPresenceTimeline';

const { provisionDesktop, saveConsent } = vi.hoisted(() => ({ provisionDesktop: vi.fn(), saveConsent: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));
vi.mock('@/lib/desktopAttendance', () => ({ ensureTrustedDesktopDevice: provisionDesktop, setDesktopActivityConsent: saveConsent }));

describe('DesktopPresenceTimeline', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps active, AFK, unavailable, legacy, and heartbeat gap states distinct', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: {
      events: [
        { appId: 'code.exe', presenceStatus: 'active', startedAt: '2026-10-01T09:00:00Z', endedAt: '2026-10-01T09:01:00Z' },
        { appId: null, presenceStatus: 'afk', startedAt: '2026-10-01T08:00:00Z', endedAt: '2026-10-01T08:01:00Z' },
        { appId: null, presenceStatus: 'unavailable', startedAt: '2026-10-01T07:00:00Z', endedAt: '2026-10-01T07:01:00Z' },
        { appId: 'legacy', startedAt: '2026-10-01T06:00:00Z', endedAt: '2026-10-01T06:01:00Z' },
      ],
      gaps: [{ gapStartedAt: '2026-10-01T05:00:00Z', gapEndedAt: '2026-10-01T05:20:00Z', reason: 'presence_heartbeat_missing' }],
    } } } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    expect(await screen.findByText('Active · Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('AFK')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Legacy sample/)).toBeInTheDocument();
    expect(screen.getByText(/Tracking gap/)).toBeInTheDocument();
    expect(screen.getByText(/activity during this interval is unknown/i)).toBeInTheDocument();
  });

  it('does not offer a team query to a viewer without team permission', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { events: [], gaps: [] } } } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    expect(await screen.findByText(/No desktop presence intervals/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /team timeline/i })).not.toBeInTheDocument();
    expect(String(vi.mocked(api.get).mock.calls[0][0])).not.toContain('userId=all');
  });

  it('shows timeline errors without implying that there were no intervals', async () => {
    vi.mocked(api.get).mockRejectedValue({ response: { data: { message: 'Active workspace membership required' } } });
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Active workspace membership required');
    expect(screen.queryByText(/No desktop presence intervals/)).not.toBeInTheDocument();
  });

  it('lets an authorized manager filter the team timeline to one member', async () => {
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('/members')
      ? { data: { data: [{ _id: 'member-1', name: 'Sam' }] } } as any
      : { data: { data: { events: [], gaps: [] } } } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" canViewTeam />);
    fireEvent.click(await screen.findByRole('button', { name: 'Show team timeline' }));
    const memberSelect = await screen.findByLabelText('Member');
    fireEvent.change(memberSelect, { target: { value: 'member-1' } });
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.some(([url]) => String(url).includes('userId=member-1'))).toBe(true));
  });

  it('shows app icons, distinct sessions, and combined usage time', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: {
      events: [
        { appId: 'code.exe', presenceStatus: 'active', startedAt: '2026-10-01T09:00:00Z', endedAt: '2026-10-01T09:01:00Z' },
        { appId: 'chrome.exe', presenceStatus: 'active', startedAt: '2026-10-01T09:01:00Z', endedAt: '2026-10-01T09:02:00Z' },
        { appId: 'code.exe', presenceStatus: 'active', startedAt: '2026-10-01T09:02:00Z', endedAt: '2026-10-01T09:03:00Z' },
      ], gaps: [],
    } } } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    expect(await screen.findByText('App usage')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Visual Studio Code app icon').length).toBeGreaterThan(0);
    expect(screen.getByText('2m')).toBeInTheDocument();
  });

  it('attaches the paired laptop to a different-device shift only after an explicit action', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { events: [], gaps: [] } } } as any);
    provisionDesktop.mockResolvedValue({ deviceId: 'device-1' });
    saveConsent.mockResolvedValue(undefined);
    const getStatus = vi.fn()
      .mockResolvedValueOnce({ clockedIn: true, clockedInOnThisDevice: false, presenceTrackingActive: false, workspaceId: 'ws1', activityMonitoringEnabled: false })
      .mockResolvedValueOnce({ clockedIn: true, clockedInOnThisDevice: false, presenceTrackingActive: true, workspaceId: 'ws1', activityMonitoringEnabled: true });
    const attachPresenceToActiveShift = vi.fn().mockResolvedValue({ attached: true });
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: {
      getStatus, getCapabilities: vi.fn().mockResolvedValue({ platform: 'win32', foregroundMonitoringSupported: true, idleDetectionSupported: true }),
      getCurrentPresence: vi.fn().mockResolvedValue(null), attachPresenceToActiveShift,
    } });
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Consent and track from this laptop' }));
    await waitFor(() => expect(attachPresenceToActiveShift).toHaveBeenCalled());
    expect(saveConsent).toHaveBeenCalledWith('device-1', true);
    expect(await screen.findByText('This laptop is reporting app and active/AFK presence')).toBeInTheDocument();
    delete (window as any).teamseverDesktop;
  });

  it('shows the live foreground app session timer in the paired desktop', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { events: [], gaps: [] } } } as any);
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: {
      getStatus: vi.fn().mockResolvedValue({ clockedIn: true, clockedInOnThisDevice: true, presenceTrackingActive: true, workspaceId: 'ws1', activityMonitoringEnabled: true }),
      getCapabilities: vi.fn().mockResolvedValue({ platform: 'win32', foregroundMonitoringSupported: true, idleDetectionSupported: true }),
      getCurrentPresence: vi.fn().mockResolvedValue({ appId: 'code.exe', presenceStatus: 'active', startedAt: new Date().toISOString() }),
    } });
    render(<DesktopPresenceTimeline workspaceId="ws1" />);
    expect(await screen.findByText('Current foreground app · Active')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText(/^00:00:\d\d$/)).toBeInTheDocument();
    delete (window as any).teamseverDesktop;
  });
});
