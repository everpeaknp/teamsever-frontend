import { describe, expect, it } from 'vitest';
import { clearAnalyticsCache, readAnalyticsCacheForUser } from './analyticsCache';

const cached = (userId: string) => JSON.stringify({
  timestamp: 1_000,
  userId,
  members: [{ id: 'member-1' }],
  tasks: [{ id: 'task-1' }],
});

describe('readAnalyticsCacheForUser', () => {
  it('does not expose another account’s cached analytics', () => {
    expect(readAnalyticsCacheForUser(cached('former-user'), 'current-user', 2_000, 5_000)).toBeNull();
  });

  it('accepts fresh analytics cached for the current account', () => {
    expect(readAnalyticsCacheForUser(cached('current-user'), 'current-user', 2_000, 5_000)?.tasks).toEqual([{ id: 'task-1' }]);
  });

  it('rejects cache without an authenticated user or after expiry', () => {
    expect(readAnalyticsCacheForUser(cached('current-user'), '', 2_000, 5_000)).toBeNull();
    expect(readAnalyticsCacheForUser(cached('current-user'), 'current-user', 7_000, 5_000)).toBeNull();
  });

  it('removes analytics snapshots when signing out', () => {
    sessionStorage.setItem('analytics_cache_workspace-1', cached('former-user'));
    sessionStorage.setItem('unrelated', 'keep');
    clearAnalyticsCache(sessionStorage);
    expect(sessionStorage.getItem('analytics_cache_workspace-1')).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
    sessionStorage.removeItem('unrelated');
  });
});
