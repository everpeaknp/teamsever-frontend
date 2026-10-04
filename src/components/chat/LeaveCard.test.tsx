import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeaveCard } from './LeaveCard';
import { api } from '@/lib/axios';

vi.mock('@/lib/axios', () => ({ api: { patch: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const message = {
  _id: 'message-1',
  content: 'Leave request',
  sender: { _id: 'requester-1', name: 'Requester' },
  metadata: { leaveRequestId: 'leave-1', status: 'pending' as const },
  createdAt: '2026-09-29T00:00:00.000Z',
};

function renderCard({ currentUserId, canManageLeaves, isWorkspaceOwner = false }: {
  currentUserId: string;
  canManageLeaves: boolean;
  isWorkspaceOwner?: boolean;
}) {
  return render(
    <LeaveCard
      message={message}
      currentUserId={currentUserId}
      canManageLeaves={canManageLeaves}
      isWorkspaceOwner={isWorkspaceOwner}
      workspaceId="workspace-1"
    />
  );
}

describe('LeaveCard decision actions', () => {
  beforeEach(() => vi.clearAllMocks());
  it('shows expired requests as history with no decision actions', () => {
    render(<LeaveCard message={{ ...message, metadata: { ...message.metadata, status: 'expired' as any } }} currentUserId="approver-1" canManageLeaves isWorkspaceOwner={false} workspaceId="workspace-1" />);
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull();
  });
  it('does not let a non-owner requester decide their own leave request', () => {
    renderCard({ currentUserId: 'requester-1', canManageLeaves: true });

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull();
  });

  it('lets an authorized assigned approver decide the request', () => {
    renderCard({ currentUserId: 'approver-1', canManageLeaves: true });

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });

  it('keeps decision actions available to a workspace owner requesting leave', () => {
    renderCard({ currentUserId: 'requester-1', canManageLeaves: true, isWorkspaceOwner: true });

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });

  it('immediately marks a successful decision terminal and refreshes conversation messages', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true } } as never);
    const refresh = vi.fn().mockResolvedValue(true);
    render(<LeaveCard message={message} currentUserId="approver-1" canManageLeaves isWorkspaceOwner={false} workspaceId="workspace-1" onStatusUpdated={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('refreshes and disables stale actions when the backend reports a completed decision', async () => {
    const conflict = Object.assign(new Error('Conflict'), { response: { status: 409, data: { message: 'Leave request has already been denied' } } });
    vi.mocked(api.patch).mockRejectedValue(conflict);
    const refresh = vi.fn().mockResolvedValue(true);
    render(<LeaveCard message={message} currentUserId="approver-1" canManageLeaves isWorkspaceOwner={false} workspaceId="workspace-1" onStatusUpdated={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByText('Denied')).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('keeps actions disabled and offers a retry when status refresh fails', async () => {
    const conflict = Object.assign(new Error('Conflict'), { response: { status: 409, data: { message: 'Leave request has already been expired' } } });
    vi.mocked(api.patch).mockRejectedValue(conflict);
    const refresh = vi.fn().mockRejectedValue(new Error('offline'));
    render(<LeaveCard message={message} currentUserId="approver-1" canManageLeaves isWorkspaceOwner={false} workspaceId="workspace-1" onStatusUpdated={refresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /refresh conversation/i })).toBeInTheDocument());
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});
