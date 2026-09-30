import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { DesktopPresenceTimeline } from './DesktopPresenceTimeline';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));

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
    expect(await screen.findByText('Active · code.exe')).toBeInTheDocument();
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
});
