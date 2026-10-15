import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatSidebar } from './ChatSidebar';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/axios', () => ({ api: { get: mocks.get, post: vi.fn(), patch: vi.fn() } }));
vi.mock('@/hooks/usePresence', () => ({ usePresence: () => ({ isUserOnline: () => false }) }));
vi.mock('@/store/useChatStore', () => ({
  useChatStore: () => ({ getRoom: () => undefined }),
  generateDMRoomId: () => 'dm-room',
}));
vi.mock('@/store/useAuthStore', () => ({ useAuthStore: () => ({ user: null, setUser: vi.fn() }) }));
vi.mock('@/lib/socket', () => ({ getSocket: () => null }));
vi.mock('./CreateChannelModal', () => ({ CreateChannelModal: () => null }));

describe('ChatSidebar mobile group chat list', () => {
  beforeEach(() => {
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('userId', 'current-user');
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/chat/channels')) {
        return Promise.resolve({ data: { success: true, data: [
          { _id: 'general', name: 'General', description: 'Team-wide updates', type: 'public', isDefault: true },
          { _id: 'private-1', name: 'Private room', description: 'A smaller team discussion', type: 'private' },
        ] } });
      }
      if (url.endsWith('/members')) {
        return Promise.resolve({ data: { success: true, data: [
          { _id: 'member-1', name: 'A teammate', email: 'teammate@example.com' },
        ] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('keeps channel lists on mobile and hides the separate DM list until desktop width', async () => {
    render(
      <ChatSidebar
        workspaceId="workspace-1"
        activeChannel="general"
        onChannelSelect={vi.fn()}
        isAdmin
      />
    );

    expect(await screen.findByText('General')).toBeInTheDocument();
    expect(screen.getByText('Private Groups')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Group conversations' })).toBeInTheDocument();
    expect(screen.getByText('Choose a channel to see messages')).toBeInTheDocument();
    expect(screen.getByText('Team-wide updates')).toBeInTheDocument();
    expect(screen.getByText('A smaller team discussion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create channel' })).toHaveClass('h-11', 'w-11');

    const directMessagesHeading = screen.getByText('Direct Messages');
    expect(directMessagesHeading.parentElement).toHaveClass('hidden', 'md:block');
  });
});
