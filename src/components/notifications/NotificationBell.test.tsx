import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from './NotificationBell';

const testState = vi.hoisted(() => ({
  pathname: '/workspace/old/analytics',
  get: vi.fn(),
  replace: vi.fn(),
  setUnreadCount: vi.fn(),
  setLoading: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => testState.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/axios', () => ({ api: { get: testState.get } }));
vi.mock('@/store/useNotificationStore', () => {
  const useNotificationStore = Object.assign(
    () => ({
      bellNotifications: [], unreadCount: 0, isLoading: false,
      setUnreadCount: testState.setUnreadCount, setLoading: testState.setLoading,
    }),
    { getState: () => ({ bellNotifications: [] }) },
  );
  return { useNotificationStore, replaceBellNotifications: testState.replace };
});

describe('NotificationBell workspace changes', () => {
  afterEach(() => {
    testState.get.mockReset();
    testState.replace.mockReset();
    testState.pathname = '/workspace/old/analytics';
  });

  it('ignores a previous workspace response that finishes after the new one', async () => {
    const pending = new Map<string, (value: unknown) => void>();
    testState.get.mockImplementation((url: string) => {
      if (url.includes('unread-count')) return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      return new Promise((resolve) => pending.set(url.includes('workspaceId=old') ? 'old' : 'new', resolve));
    });
    localStorage.setItem('authToken', 'test-token');
    const view = render(<NotificationBell />);
    await waitFor(() => expect(pending.has('old')).toBe(true));
    testState.pathname = '/workspace/new/analytics';
    view.rerender(<NotificationBell />);
    await waitFor(() => expect(pending.has('new')).toBe(true));

    await act(async () => pending.get('new')!({ data: { data: [{ _id: 'new-item' }], pagination: {} } }));
    await act(async () => pending.get('old')!({ data: { data: [{ _id: 'old-item' }], pagination: {} } }));

    expect(testState.replace.mock.calls.at(-1)?.[0]).toEqual([{ _id: 'new-item' }]);
    localStorage.removeItem('authToken');
  });
});
