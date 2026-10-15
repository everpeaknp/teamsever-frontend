import { afterEach, describe, expect, it, vi } from 'vitest';
import { replaceBellNotifications, useNotificationStore, type Notification } from './useNotificationStore';

const notification = (id: string): Notification => ({
  _id: id,
  type: 'TEST',
  title: id,
  body: '',
  read: false,
  createdAt: new Date(0).toISOString(),
});
const originalSetBellNotifications = useNotificationStore.getState().setBellNotifications;
const originalVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

describe('replaceBellNotifications', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalVapidKey === undefined) {
      delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    } else {
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY = originalVapidKey;
    }
    useNotificationStore.setState({
      bellNotifications: [],
      setBellNotifications: originalSetBellNotifications,
    });
  });

  it('updates the bell list even when Fast Refresh preserved a state without the new action', () => {
    useNotificationStore.setState({ setBellNotifications: undefined } as unknown as Partial<ReturnType<typeof useNotificationStore.getState>>);

    replaceBellNotifications([notification('one'), notification('one'), notification('two')]);

    expect(useNotificationStore.getState().bellNotifications.map(({ _id }) => _id)).toEqual(['one', 'two']);
  });

  it('treats an unset web-push VAPID key as optional local configuration', async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await useNotificationStore.getState().initializeFCM();

    expect(error).not.toHaveBeenCalledWith(
      expect.stringContaining('VAPID key not configured'),
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
