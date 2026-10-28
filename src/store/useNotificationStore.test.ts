import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastInfo = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { info: toastInfo, error: vi.fn() } }));
vi.mock('@/lib/firebase', () => ({
  requestNotificationPermission: vi.fn(),
  onMessageListener: vi.fn(),
}));
vi.mock('@/lib/axios', () => ({ api: { post: vi.fn() } }));

import { useNotificationStore } from './useNotificationStore';

const notification = {
  _id: 'notification-1',
  type: 'TASK_UPDATED',
  title: 'Task updated',
  body: 'The task changed',
  read: false,
  createdAt: new Date().toISOString(),
};

describe('notification toasts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationStore.setState({
      notifications: [],
      bellNotifications: [],
      unreadCount: 0,
      processedNotificationIds: new Set(),
    });
  });

  it('does not toast for updates while the notification center is open', () => {
    window.history.replaceState({}, '', '/workspace/ws-1/notifications');

    useNotificationStore.getState().addNotification(notification);

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(toastInfo).not.toHaveBeenCalled();
  });

  it('still toasts for updates elsewhere in the app', () => {
    window.history.replaceState({}, '', '/workspace/ws-1/spaces');

    useNotificationStore.getState().addNotification(notification);

    expect(toastInfo).toHaveBeenCalledOnce();
  });
});
