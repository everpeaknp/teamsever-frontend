import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileSidebar } from './MobileSidebar';

const navigation = vi.hoisted(() => ({
  pathname: '/workspace/ws1/analytics',
  navigate: null as null | (() => void),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock('./AppSidebar', () => ({
  AppSidebar: () => (
    <>
      <a href="/workspace/ws1/quality" onClick={event => {
        event.preventDefault();
        navigation.navigate?.();
      }}>Quality</a>
      <a href="/workspace/ws1/analytics" onClick={event => event.preventDefault()}>Dashboard</a>
    </>
  ),
}));

describe('MobileSidebar', () => {
  beforeEach(() => {
    navigation.pathname = '/workspace/ws1/analytics';
    navigation.navigate = null;
  });

  it('closes after selecting a destination that changes the route', () => {
    const { rerender } = render(<MobileSidebar variant="bottom" />);
    navigation.navigate = () => {
      navigation.pathname = '/workspace/ws1/quality';
      rerender(<MobileSidebar variant="bottom" />);
    };

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog', { name: 'Navigation Menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Quality' }));

    expect(screen.queryByRole('dialog', { name: 'Navigation Menu' })).not.toBeInTheDocument();
  });

  it('closes when selecting the destination for the current route', () => {
    render(<MobileSidebar variant="bottom" />);

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('dialog', { name: 'Navigation Menu' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

    expect(screen.queryByRole('dialog', { name: 'Navigation Menu' })).not.toBeInTheDocument();
  });
});
