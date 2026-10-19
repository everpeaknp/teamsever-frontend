import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FolderMemberManagement } from './FolderMemberManagement';
import { SpaceMemberManagement } from './SpaceMemberManagement';

vi.mock('@/lib/axios', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: [{
      _id: 'member-1',
      name: 'Workspace Member',
      email: 'member@example.com',
      workspaceRole: 'member',
      spacePermissionLevel: null,
      hasOverride: false,
      addedBy: null,
      addedAt: null,
    }] } }),
  },
}));

vi.mock('@/store/useAuthStore', () => ({
  usePermissions: () => ({ isAdmin: () => true, isOwner: () => false }),
}));

describe('member management dialogs on phones', () => {
  it('bounds the folder permission table in a focusable scroll region', async () => {
    render(
      <FolderMemberManagement
        open
        onOpenChange={vi.fn()}
        folderId="folder-1"
        folderName="A long folder name that needs to wrap"
      />,
    );

    const region = screen.getByRole('region', { name: 'Folder members and permissions' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('min-w-0', 'overflow-auto', 'overscroll-contain');
    await waitFor(() => expect(screen.getByText('Workspace Role')).toBeInTheDocument());
  });

  it('bounds the space permission table in a focusable scroll region', async () => {
    render(
      <SpaceMemberManagement
        open
        onOpenChange={vi.fn()}
        spaceId="space-1"
        spaceName="A long space name that needs to wrap"
      />,
    );

    const region = screen.getByRole('region', { name: 'Space members and permissions' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('min-w-0', 'overflow-auto', 'overscroll-contain');
    await waitFor(() => expect(screen.getByText('Workspace Role')).toBeInTheDocument());
  });
});
