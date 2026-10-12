import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { LiveAttendanceTimers } from './LiveAttendanceTimers';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const payload = (overrides: Record<string, unknown> = {}) => ({ data: { data: {
  scope: 'workspace', canManageTeam: true, activeTimerCount: 1,
  activeTimers: [{ _id: 'entry-1', user: { _id: 'user-1', name: 'Sam Worker', email: 'sam@example.com' }, startTime: new Date(Date.now() - 120_000).toISOString(), currentDuration: 120 }],
  ...overrides,
} } });

describe('LiveAttendanceTimers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the live workspace roster from the shared clock-status API', async () => {
    vi.mocked(api.get).mockResolvedValue(payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    expect(await screen.findByText('Currently clocked in')).toBeInTheDocument();
    expect(screen.getByText('Sam Worker')).toBeInTheDocument();
    expect(screen.getByText('sam@example.com')).toBeInTheDocument();
    expect(vi.mocked(api.get)).toHaveBeenCalledWith('/time/workspace/workspace-1/clock-status');
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
    expect(api.get).toHaveBeenCalledTimes(2);
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
      .mockResolvedValueOnce(payload() as any);
    render(<LiveAttendanceTimers workspaceId="workspace-1" />);
    expect(await screen.findByText('Sam Worker')).toBeInTheDocument();
    expect(api.get).toHaveBeenNthCalledWith(1, '/time/workspace/workspace-1/clock-status');
    expect(api.get).toHaveBeenNthCalledWith(2, '/time/admin/workspace/workspace-1/active');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
