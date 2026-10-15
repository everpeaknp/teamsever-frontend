import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/user-avatar', () => ({
  UserAvatar: ({ user }: { user: { name?: string; profilePicture?: string } }) => (
    <img alt={user.name} src={user.profilePicture} />
  ),
}));

import { ChatConversationIdentity } from './ChatConversationIdentity';
import { useProfileModalStore } from '@/store/useProfileModalStore';

describe('ChatConversationIdentity', () => {
  beforeEach(() => useProfileModalStore.setState({ isOpen: false, userId: null }));

  it('shows the direct-message profile photo and opens that user profile when clicked', () => {
    render(
      <ChatConversationIdentity
        type="direct"
        title="EveracyAdmin"
        profileUser={{
          _id: 'user-42',
          name: 'EveracyAdmin',
          email: 'admin@example.com',
          profilePicture: 'https://example.com/admin.png',
        }}
      />
    );

    const profileButton = screen.getByRole('button', { name: 'Open EveracyAdmin profile' });
    expect(screen.getByAltText('EveracyAdmin').getAttribute('src')).toBe('https://example.com/admin.png');

    fireEvent.click(profileButton);

    expect(useProfileModalStore.getState()).toMatchObject({ isOpen: true, userId: 'user-42' });
  });
});
