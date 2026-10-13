import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GroupChatPage from './page';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ws1' }),
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/lib/axios', () => ({ api: { get: mocks.get } }));

vi.mock('@/components/chat', () => ({
  ChatSidebar: ({ onChannelSelect }: { onChannelSelect: (...args: any[]) => void }) => (
    <nav aria-label="Group chat channels">
      <button onClick={() => onChannelSelect('channel-1', 'workspace', 'Engineering')}>
        Engineering
      </button>
    </nav>
  ),
  ChatWindow: ({ title, onMenuClick }: { title: string; onMenuClick: () => void }) => (
    <section aria-label="Chat conversation">
      <h1>{title}</h1>
      <button onClick={onMenuClick}>Back to channels</button>
    </section>
  ),
}));

vi.mock('@/components/chat/MessageModeNav', () => ({
  MessageModeNav: () => <nav aria-label="Message views">Group Chat</nav>,
}));

describe('GroupChatPage mobile navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('userId', 'user-1');
    mocks.push.mockReset();
    mocks.get.mockReset();
    mocks.get.mockImplementation((path: string) => {
      if (path === '/workspaces/ws1') {
        return Promise.resolve({ data: { success: true, data: {
          name: 'Workspace', owner: 'user-1', members: [{ user: 'user-1', role: 'admin' }],
          subscription: { plan: { features: { hasGroupChat: true } } },
        } } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  it('shows the channel list first on mobile, even when a channel was previously saved', async () => {
    localStorage.setItem('active_chat_state_ws1', JSON.stringify({ channelId: 'general', type: 'workspace', name: 'General' }));
    render(<GroupChatPage />);

    expect(await screen.findByRole('navigation', { name: 'Group chat channels' })).toBeInTheDocument();
    expect(screen.getByLabelText('Chat conversation').parentElement).toHaveClass('hidden', 'md:flex');
  });

  it('opens a channel after selection and returns to the list with the back control', async () => {
    render(<GroupChatPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Engineering' }));
    await waitFor(() => expect(screen.getByLabelText('Chat conversation').parentElement).toHaveClass('flex'));
    expect(screen.getByRole('heading', { name: '# Engineering' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to channels' }));
    expect(screen.getByRole('navigation', { name: 'Group chat channels' }).parentElement).toHaveClass('flex');
  });
});
