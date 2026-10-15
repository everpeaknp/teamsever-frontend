import { describe, expect, it } from 'vitest';
import { normalizeWorkspacePresence } from './normalizeWorkspacePresence';

describe('normalizeWorkspacePresence', () => {
  it('maps workspace online and offline response entries by user id', () => {
    const lastSeen = '2026-10-14T10:00:00.000Z';
    const result = normalizeWorkspacePresence({
      onlineUsers: [{ userId: 'online-id', status: 'online', user: { name: 'Online' } }],
      offlineUsers: [{ userId: 'offline-id', status: 'offline', lastSeen, user: { name: 'Offline' } }],
    });

    expect(result.onlineUsers).toEqual(['online-id']);
    expect(result.userPresence.get('offline-id')).toMatchObject({
      userId: 'offline-id',
      userName: 'Offline',
      status: 'offline',
      lastSeen: new Date(lastSeen),
    });
  });
});
