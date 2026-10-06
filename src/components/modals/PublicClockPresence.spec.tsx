import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicClockPresence } from './PublicClockPresence';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: { get } }));

describe('PublicClockPresence', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-05T10:00:00.000Z'));
    get.mockReset();
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows the live shift and fresh desktop app timers for workspace members', async () => {
    get.mockResolvedValue({ data: { data: {
      clockedIn: true,
      clockedInAt: '2026-10-05T09:30:00.000Z',
      foregroundApp: {
        appId: 'code.exe',
        presenceStatus: 'active',
        startedAt: '2026-10-05T09:57:00.000Z',
        reportedAt: '2026-10-05T09:59:55.000Z',
      },
    } } });

    render(<PublicClockPresence workspaceId="workspace-1" userId="member-1" />);

    expect(await screen.findByText('Clocked in')).toBeInTheDocument();
    expect(screen.getByLabelText('Shift duration')).toBeInTheDocument();
    expect(screen.getByText('00:30:00')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('00:03:00')).toBeInTheDocument();
    expect(screen.queryByText('Visible to workspace members')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Public work presence')).toHaveAttribute('title', 'Visible to workspace members');
    expect(get).toHaveBeenCalledWith('/attendance/workspace/workspace-1/members/member-1/public-presence');
  });

  it('does not render an availability badge when the person is clocked out', async () => {
    get.mockResolvedValue({ data: { data: { clockedIn: false, clockedInAt: null, foregroundApp: null } } });

    const { container } = render(<PublicClockPresence workspaceId="workspace-1" userId="member-1" />);

    await waitFor(() => expect(get).toHaveBeenCalledOnce());
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the shift timer and a clear desktop fallback when no fresh app report exists', async () => {
    get.mockResolvedValue({ data: { data: {
      clockedIn: true,
      clockedInAt: '2026-10-05T09:30:00.000Z',
      foregroundApp: null,
    } } });

    render(<PublicClockPresence workspaceId="workspace-1" userId="member-1" />);

    expect(await screen.findByText('Clocked in')).toBeInTheDocument();
    expect(screen.getByText('00:30:00')).toBeInTheDocument();
    expect(screen.getByText('Desktop app not reporting')).toBeInTheDocument();
  });
});
