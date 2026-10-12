import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MobileWorkspaceTabBar } from './MobileWorkspaceTabBar';

const navigation = vi.hoisted(() => ({ pathname: '/workspace/ws1/analytics' }));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

describe('MobileWorkspaceTabBar', () => {
  it('provides the primary workspace routes and marks the active destination', () => {
    render(<MobileWorkspaceTabBar workspaceId="ws1" spaces={[{ _id: 'space1' }]} />);

    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/workspace/ws1/analytics');
    expect(screen.getByRole('link', { name: 'Spaces' })).toHaveAttribute('href', '/workspace/ws1/spaces/space1');
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/workspace/ws1/inbox');
    expect(screen.getByRole('link', { name: 'Attendance' })).toHaveAttribute('href', '/workspace/ws1/attendance');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('disables the Spaces destination until the workspace has a space to open', () => {
    render(<MobileWorkspaceTabBar workspaceId="ws1" spaces={[]} />);

    expect(screen.getByText('Spaces').closest('[aria-disabled="true"]')).toBeInTheDocument();
  });
});
