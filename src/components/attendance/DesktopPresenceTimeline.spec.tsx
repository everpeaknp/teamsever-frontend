import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { DesktopPresenceTimeline } from './DesktopPresenceTimeline';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));

const roster = (canViewHistory = false) => ({
  success: true,
  data: {
    members: [
      { userId: 'u1', displayName: 'Ramon', avatar: null, presence: { appId: 'WhatsApp.Root', presenceStatus: 'active', reportedAt: '2026-10-04T10:00:00.000Z' } },
      { userId: 'u2', displayName: 'Ada', avatar: null, presence: null },
    ],
    pagination: { nextCursor: null, hasMore: false, pageSize: 50 },
    permissions: { canViewHistory },
  },
});

const history = {
  success: true,
  data: {
    member: { userId: 'u2', displayName: 'Ada', avatar: null },
    summary: { apps: [{ appId: 'WhatsApp.Root', durationMs: 120_000, sessions: 2 }], activeMs: 120_000, afkMs: 60_000, gapMs: 30_000 },
    items: [
      { kind: 'app', id: 'app-1', appId: 'WhatsApp.Root', presenceStatus: 'active', startedAt: '2026-10-04T10:00:00.000Z', endedAt: '2026-10-04T10:02:00.000Z' },
      { kind: 'gap', id: 'gap-1', reason: 'presence_heartbeat_missing', active: false, startedAt: '2026-10-04T09:00:00.000Z', endedAt: '2026-10-04T09:00:30.000Z' },
    ],
    pagination: { nextCursor: null, hasMore: false, pageSize: 50 },
  },
};

describe('DesktopPresenceTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: roster() } as any);
  });

  it('shows current app and active/AFK/not-reporting state person by person', async () => {
    render(<DesktopPresenceTimeline workspaceId="ws1" />);

    expect(await screen.findByText('Ramon')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Not reporting')).toBeInTheDocument();
    expect(String(vi.mocked(api.get).mock.calls[0][0])).toContain('/desktop-presence/current');
  });

  it('does not offer a detailed history action without the server permission', async () => {
    render(<DesktopPresenceTimeline workspaceId="ws1" />);

    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view activity for ada/i })).not.toBeInTheDocument();
  });

  it('loads one selected member history only after an authorized admin opens it', async () => {
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('/desktop-activity')
      ? { data: history } as any
      : { data: roster(true) } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" />);

    fireEvent.click(await screen.findByRole('button', { name: /view activity for ada/i }));

    expect(await screen.findByText('App usage')).toBeInTheDocument();
    expect(screen.getByText('2 sessions')).toBeInTheDocument();
    expect(screen.getAllByText(/Tracking gap/).length).toBeGreaterThan(0);
    await waitFor(() => expect(vi.mocked(api.get).mock.calls.some(([url]) => String(url).includes('userId=u2'))).toBe(true));
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).includes('/desktop-activity')).every(([url]) => !String(url).includes('userId=all'))).toBe(true);
  });

  it('appends roster pages rather than requesting team history', async () => {
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('cursor=')
      ? { data: { data: { members: [{ userId: 'u3', displayName: 'Bea', avatar: null, presence: null }], pagination: { nextCursor: null, hasMore: false, pageSize: 50 }, permissions: { canViewHistory: false } } } } as any
      : { data: { data: { ...roster().data, pagination: { nextCursor: 'next-page', hasMore: true, pageSize: 50 } } } } as any);
    render(<DesktopPresenceTimeline workspaceId="ws1" />);

    expect(await screen.findByRole('button', { name: /load more people/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /load more people/i }));

    expect(await screen.findByText('Bea')).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.every(([url]) => !String(url).includes('userId=all'))).toBe(true);
  });

  it('shows live foreground app timer in the paired desktop self context', async () => {
    Object.defineProperty(window, 'teamseverDesktop', { configurable: true, value: {
      getStatus: vi.fn().mockResolvedValue({ clockedIn: true, clockedInOnThisDevice: true, presenceTrackingActive: true, workspaceId: 'ws1', activityMonitoringEnabled: true }),
      getCapabilities: vi.fn().mockResolvedValue({ platform: 'win32', foregroundMonitoringSupported: true, idleDetectionSupported: true }),
      getCurrentPresence: vi.fn().mockResolvedValue({ appId: 'code.exe', presenceStatus: 'active', startedAt: new Date().toISOString() }),
      getPresenceDiagnostics: vi.fn().mockResolvedValue({ running: true, lastError: null, lastSuccessfulHeartbeatAt: new Date().toISOString() }),
    } });
    render(<DesktopPresenceTimeline workspaceId="ws1" />);

    expect(await screen.findByText('Current foreground app · Active')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText(/^00:00:\d\d$/)).toBeInTheDocument();
    delete (window as any).teamseverDesktop;
  });
});
