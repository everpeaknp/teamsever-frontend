import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LeaveCard } from './LeaveCard';

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
});
