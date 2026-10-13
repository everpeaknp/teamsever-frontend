import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileWorkspaceTabBar } from './MobileWorkspaceTabBar';

const navigation = vi.hoisted(() => ({ pathname: '/workspace/ws1/analytics' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

describe('MobileWorkspaceTabBar', () => {
  beforeEach(() => {
    navigation.pathname = '/workspace/ws1/analytics';
  });

  it('provides the primary workspace routes and marks the active destination', () => {
    render(<MobileWorkspaceTabBar workspaceId="ws1" />);

    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/workspace/ws1/analytics');
    expect(screen.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/workspace/ws1/spaces');
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/workspace/ws1/inbox');
    expect(screen.getByRole('link', { name: 'Attendance' })).toHaveAttribute('href', '/workspace/ws1/attendance');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the Spaces directory available even when there are no spaces yet', () => {
    render(<MobileWorkspaceTabBar workspaceId="ws1" />);

    expect(screen.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/workspace/ws1/spaces');
  });

  it('marks the space directory active without selecting a space', () => {
    navigation.pathname = '/workspace/ws1/spaces';
    render(<MobileWorkspaceTabBar workspaceId="ws1" />);

    expect(screen.getByRole('link', { name: 'Spaces' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/workspace/ws1/spaces');
  });

  it('provides an accessible More control for destinations outside the primary tabs', () => {
    render(<MobileWorkspaceTabBar workspaceId="ws1" />);

    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });
});
