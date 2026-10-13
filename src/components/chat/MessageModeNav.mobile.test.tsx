import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageModeNav } from './MessageModeNav';

const navigation = vi.hoisted(() => ({ pathname: '/workspace/ws1/inbox' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

describe('MessageModeNav', () => {
  it('lets mobile users switch between direct and group messages', () => {
    navigation.pathname = '/workspace/ws1/inbox';
    render(<MessageModeNav workspaceId="ws1" />);

    expect(screen.getByRole('navigation', { name: 'Message views' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Direct Messages' })).toHaveAttribute('href', '/workspace/ws1/inbox');
    expect(screen.getByRole('link', { name: 'Group Chat' })).toHaveAttribute('href', '/workspace/ws1/chat');
    expect(screen.getByRole('link', { name: 'Direct Messages' })).toHaveAttribute('aria-current', 'page');
  });

  it('marks group chat active on its route', () => {
    navigation.pathname = '/workspace/ws1/chat';
    render(<MessageModeNav workspaceId="ws1" />);

    expect(screen.getByRole('link', { name: 'Group Chat' })).toHaveAttribute('aria-current', 'page');
  });
});
