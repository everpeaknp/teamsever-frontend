import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaveCard } from './LeaveCard';

vi.mock('next/dynamic', () => ({ default: () => ({ latitude, longitude }: { latitude: number; longitude: number }) => <div data-testid="remote-location-map">Map at {latitude}, {longitude}<span>© OpenStreetMap contributors</span></div> }));

const message = {
  _id: 'message-1',
  content: 'Leave request',
  sender: { _id: 'requester-1', name: 'Requester' },
  metadata: { leaveRequestId: 'leave-1', status: 'pending' as const },
  createdAt: '2026-09-29T00:00:00.000Z',
};

function renderCard({ currentUserId, canManageLeaves, isWorkspaceOwner = false, isDirectConversation = false }: {
  currentUserId: string;
  canManageLeaves: boolean;
  isWorkspaceOwner?: boolean;
  isDirectConversation?: boolean;
}) {
  return render(
    <LeaveCard
      message={message}
      currentUserId={currentUserId}
      canManageLeaves={canManageLeaves}
      isWorkspaceOwner={isWorkspaceOwner}
      isDirectConversation={isDirectConversation}
      workspaceId="workspace-1"
    />
  );
}

describe('LeaveCard decision actions', () => {
  it('shows a received remote location map and lets the approver expand it without embed-provider clutter', async () => {
    const remoteMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        requestType: 'remote' as const,
        remoteLocation: { name: 'Temporary apartment', latitude: 28.21555, longitude: 83.98274 },
      },
    };
    render(<LeaveCard message={remoteMessage} currentUserId="approver-1" canManageLeaves={true} isWorkspaceOwner={false} workspaceId="workspace-1" />);

    expect(screen.getByTestId('remote-location-map')).toBeInTheDocument();
    expect(screen.getByText(/© OpenStreetMap contributors/i)).toBeInTheDocument();
    expect(screen.queryByText(/Report a problem|Make a Donation/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand map' }));

    expect(screen.getByRole('dialog', { name: 'Temporary apartment' })).toHaveClass('max-h-[calc(100dvh-1rem)]', 'overflow-y-auto');
    expect(screen.getAllByTestId('remote-location-map')).toHaveLength(2);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Temporary apartment' })).not.toBeInTheDocument());
    expect(screen.getAllByTestId('remote-location-map')).toHaveLength(1);
  });

  it('renders as a compact message-sized card rather than filling the conversation width', () => {
    renderCard({ currentUserId: 'approver-1', canManageLeaves: true });
    const card = screen.getByTestId('leave-request-card');
    expect(card.className).toContain('w-fit');
    expect(card.className).not.toContain('w-full');
  });

  it('does not let a non-owner requester decide their own leave request', () => {
    renderCard({ currentUserId: 'requester-1', canManageLeaves: true });

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull();
    expect(screen.getByText(/you sent this request/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review inbox/i })).toHaveAttribute(
      'href',
      '/workspace/workspace-1/attendance/leave-remote',
    );
  });

  it('lets an authorized assigned approver decide the request', () => {
    renderCard({ currentUserId: 'approver-1', canManageLeaves: true });

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });

  it('shows actions to the assigned direct-message approver while workspace permissions hydrate', () => {
    render(
      <LeaveCard
        message={message}
        currentUserId="approver-1"
        canManageLeaves={false}
        isWorkspaceOwner={false}
        isDirectConversation
        workspaceId="workspace-1"
      />
    );

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });

  it('does not expose actions to an unprivileged participant outside the assigned direct message', () => {
    renderCard({ currentUserId: 'other-user', canManageLeaves: false });

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull();
    expect(screen.getByRole('link', { name: /review inbox/i })).toBeInTheDocument();
  });

  it('keeps decision actions available to a workspace owner requesting leave', () => {
    renderCard({ currentUserId: 'requester-1', canManageLeaves: true, isWorkspaceOwner: true });

    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeTruthy();
  });
});
