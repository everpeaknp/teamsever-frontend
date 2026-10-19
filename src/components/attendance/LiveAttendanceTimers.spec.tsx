import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import { LiveAttendanceTimers } from './LiveAttendanceTimers';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const payload = (overrides: Record<string, unknown> = {}) => ({ data: { data: {
  scope: 'workspace', canManageTeam: true, activeTimerCount: 1,
  activeTimers: [{ _id: 'entry-1', user: { _id: 'user-1', name: 'Sam Worker', email: 'sam@example.com' }, startTime: new Date(Date.now() - 120_000).toISOString(), currentDuration: 120 }],
  ...overrides,
} } });

describe('LiveAttendanceTimers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileModalStore.setState({ isOpen: false, userId: null });
  });

  afterEach(() => vi.useRealTimers());

  it('shows the live workspace roster from the shared clock-status API', async () => {
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('desktop-presence/current')
      ? { data: { data: { members: [{ userId: 'user-1', displayName: 'Sam Worker', avatar: null, presence: { appId: 'code.exe', presenceStatus: 'active', reportedAt: '2026-10-16T10:05:00.000Z' } }] } } } as any
      : payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    expect(await screen.findByText('Currently clocked in')).toBeInTheDocument();
    expect(screen.getByText('Sam Worker')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(await screen.findByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText('Office').closest('[data-testid="presence-location-row"]')).toContainElement(screen.getByText('Visual Studio Code'));
    const presenceCall = vi.mocked(api.get).mock.calls.find(([url]) => String(url).includes('desktop-presence/current?userIds=user-1'));
    expect(presenceCall).toBeDefined();
    expect(presenceCall?.[1]?.headers).toMatchObject({ 'Cache-Control': 'no-cache', Pragma: 'no-cache' });
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/time/workspace/workspace-1/clock-status');
  });

  it('refreshes only current desktop presence from the section refresh control', async () => {
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('desktop-presence/current')
      ? { data: { data: { members: [] } } } as any
      : payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    await screen.findByText('Sam Worker');
    vi.mocked(api.get).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh current desktop presence' }));

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.get).mock.calls.some(([url]) => String(url).startsWith('/attendance/workspace/workspace-1/desktop-presence/current?userIds=user-1&pageSize=1&_refresh='))).toBe(true);
  });

  it('updates desktop app presence independently without reloading the attendance roster', async () => {
    vi.useFakeTimers();
    let presenceRequests = 0;
    vi.mocked(api.get).mockImplementation(async (url: any) => String(url).includes('desktop-presence/current')
      ? { data: { data: { members: [{ userId: 'user-1', displayName: 'Sam Worker', avatar: null, presence: {
        appId: presenceRequests++ === 0 ? 'code.exe' : 'brave.exe',
        presenceStatus: 'active',
        reportedAt: new Date().toISOString(),
      } }] } } } as any
      : payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);

    await act(async () => {
      for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    });
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('0h 2m 0s')).toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(screen.getByText('Brave')).toBeInTheDocument();
    expect(screen.getByText('0h 2m 5s')).toBeInTheDocument();
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).includes('clock-status'))).toHaveLength(1);
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).includes('desktop-presence/current'))).toHaveLength(2);

    await act(async () => { fireEvent.focus(window); await Promise.resolve(); });
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).includes('desktop-presence/current'))).toHaveLength(3);
    expect(vi.mocked(api.get).mock.calls.filter(([url]) => String(url).includes('clock-status'))).toHaveLength(1);
  });

  it('does not let a slow presence poll invalidate itself with overlapping requests', async () => {
    vi.useFakeTimers();
    let presenceRequests = 0;
    let resolveInitialPresence: ((value: any) => void) | undefined;
    vi.mocked(api.get).mockImplementation(async (url: any) => {
      if (!String(url).includes('desktop-presence/current')) return payload() as any;
      presenceRequests += 1;
      if (presenceRequests === 1) {
        return await new Promise((resolve) => { resolveInitialPresence = resolve; }) as any;
      }
      return { data: { data: { members: [] } } } as any;
    });
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);

    await act(async () => {
      for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    });
    expect(presenceRequests).toBe(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    expect(presenceRequests).toBe(1);

    await act(async () => {
      resolveInitialPresence?.({ data: { data: { members: [{
        userId: 'user-1',
        presence: { appId: 'code.exe', presenceStatus: 'active', reportedAt: new Date().toISOString() },
      }] } } });
      for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
    });
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(presenceRequests).toBe(1);
  });


  it('opens the member profile from their name in the live roster', async () => {
    vi.mocked(api.get).mockResolvedValue(payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'View Sam Worker profile' }));

    expect(useProfileModalStore.getState().userId).toBe('user-1');
  });
  it('wraps the live roster content and keeps clock-out reachable on narrow screens', async () => {
    vi.mocked(api.get).mockResolvedValue(payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    await screen.findByText('Sam Worker');
    const section = screen.getByRole('region', { name: 'Current attendance' });
    expect(section.className).toContain('px-3');
    expect(screen.getByRole('button', { name: 'Clock out Sam Worker' }).className).toContain('min-h-11');
  });
  it('shows only the signed-in member state when the API returns self scope', async () => {
    vi.mocked(api.get).mockResolvedValue(payload({
      scope: 'self', canManageTeam: false,
      activeTimers: [{ _id: 'entry-1', user: { name: 'Sam Worker' }, startTime: new Date().toISOString(), currentDuration: 0 }],
    }) as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    expect(await screen.findByText('Clocked in')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clock out/i })).not.toBeInTheDocument();
  });

  it('allows an authorized admin to stop one timer, then refreshes status', async () => {
    vi.mocked(api.get).mockResolvedValue(payload() as any);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock out Sam Worker' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm clock out' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/time/admin/stop/entry-1', { reason: 'Admin clock-out from Attendance' }));
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  it('sends an optional admin clock-out reason for an exception', async () => {
    vi.mocked(api.get).mockResolvedValue(payload() as any);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clock out Sam Worker' }));
    fireEvent.change(screen.getByLabelText(/reason \(optional\)/i), { target: { value: 'Left the approved site before clocking out' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm clock out' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/time/admin/stop/entry-1', { reason: 'Left the approved site before clocking out' }));
  });

  it('uses the dashboard active-timer endpoint when the shared route is not available yet', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce(payload() as any)
      .mockResolvedValueOnce({ data: { data: { members: [] } } } as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    expect(await screen.findByText('Sam Worker')).toBeInTheDocument();
    expect(api.get).toHaveBeenNthCalledWith(1, '/time/workspace/workspace-1/clock-status');
    expect(api.get).toHaveBeenNthCalledWith(2, '/time/admin/workspace/workspace-1/active');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
