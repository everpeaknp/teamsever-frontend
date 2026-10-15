import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClientLayout } from './ClientLayout';
import { useMobileConversationScreen } from './MobileConversationContext';

const state = vi.hoisted(() => ({
  pathname: '/workspace/ws1/quality/reports',
  setUser: vi.fn(),
}));

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/search/SearchProvider', () => ({ SearchProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/layout/NavigationLoader', () => ({ NavigationLoader: () => null }));
vi.mock('@/components/layout/AppUpdateNotifier', () => ({ AppUpdateNotifier: () => null }));
vi.mock('@/components/layout/DesktopUpdateNotifier', () => ({ DesktopUpdateNotifier: () => null }));
vi.mock('@/components/layout/MobileWorkspaceNavigation', () => ({
  MobileWorkspaceNavigation: () => <nav aria-label="Workspace navigation" />,
}));
vi.mock('@/store/useNotificationStore', () => ({
  useNotificationStore: Object.assign(() => ({}), { getState: () => ({ syncPermission: vi.fn(), initializeFCM: vi.fn() }) }),
}));
vi.mock('@/store/useAuthStore', () => ({ useAuthStore: () => ({ user: null, setUser: state.setUser }) }));
vi.mock('@/store/useProfileModalStore', () => ({ useProfileModalStore: () => ({ isOpen: false, userId: null, closeProfile: vi.fn() }) }));
vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));

describe('ClientLayout mobile navigation', () => {
  afterEach(() => cleanup());

  function MobileConversationToggle() {
    const [isOpen, setIsOpen] = useState(true);
    useMobileConversationScreen(isOpen);
    return <button onClick={() => setIsOpen(false)}>Back to list</button>;
  }

  it('shows persistent workspace navigation on nested workspace routes', () => {
    state.pathname = '/workspace/ws1/quality/reports';

    render(<ClientLayout><div>Report page</div></ClientLayout>);

    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
  });

  it('does not show workspace navigation on authentication routes', () => {
    state.pathname = '/login';

    render(<ClientLayout><div>Login page</div></ClientLayout>);

    expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).not.toBeInTheDocument();
  });

  it('hides the app navigation while a mobile conversation is open', () => {
    state.pathname = '/workspace/ws1/inbox';

    render(<ClientLayout><MobileConversationToggle /></ClientLayout>);

    expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-app-header')).toHaveClass('hidden', 'lg:block');

    fireEvent.click(screen.getByRole('button', { name: 'Back to list' }));
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
  });
});
