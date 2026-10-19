import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { api } from '@/lib/axios';
import { TeamAvailability } from './TeamAvailability';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));

describe('TeamAvailability desktop app presence', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('shows a tracked app beside the member and leaves untracked rows blank', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { members: [
      { userId: 'active-1', presence: { appId: 'chrome.exe', presenceStatus: 'active', reportedAt: '2026-10-19T12:00:00.000Z' } },
      { userId: 'away-1', presence: { appId: 'code.exe', presenceStatus: 'afk', reportedAt: '2026-10-19T12:00:00.000Z' } },
    ] } } } as any);

    render(<TeamAvailability workspaceId="workspace-1" members={[
      { status: 'active', user: { _id: 'active-1', name: 'Active member' } },
      { status: 'active', user: { _id: 'untracked-1', name: 'Untracked member' } },
      { status: 'inactive', user: { _id: 'away-1', name: 'Clocked out member' } },
    ]} />);

    expect(await screen.findByText('Google Chrome')).toBeInTheDocument();
    expect(screen.getByLabelText('Using Visual Studio Code, away')).toBeInTheDocument();
    expect(screen.getByText('Active member')).toBeInTheDocument();
    expect(screen.getByText('Untracked member')).toBeInTheDocument();
    expect(screen.queryByText('Not tracking')).not.toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(expect.stringContaining(
      '/attendance/workspace/workspace-1/desktop-presence/current?',
    ), expect.objectContaining({ headers: expect.objectContaining({ 'Cache-Control': 'no-cache' }) })));
    expect(String(vi.mocked(api.get).mock.calls[0][0])).toContain('active-1%2Cuntracked-1');
  });

  it('clears the app label when the API no longer reports presence', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { members: [] } } } as any);

    render(<TeamAvailability workspaceId="workspace-1" members={[
      { status: 'active', user: { _id: 'active-1', name: 'Active member' } },
    ]} />);

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.queryByText('Google Chrome')).not.toBeInTheDocument();
  });
});
