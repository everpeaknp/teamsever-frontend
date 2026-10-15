import { describe, expect, it } from 'vitest';
import { getPresenceLabel, PresenceSummary } from './presenceLabel';

describe('getPresenceLabel', () => {
  it('shows live online presence', () => {
    expect(getPresenceLabel({ status: 'online' }, new Date('2026-10-15T12:00:00Z'))).toBe('Active now');
  });

  it('shows the elapsed minutes since the last seen timestamp', () => {
    expect(getPresenceLabel({ status: 'offline', lastSeen: new Date('2026-10-15T11:57:00Z') }, new Date('2026-10-15T12:00:00Z'))).toBe('Active 3 minutes ago');
  });

  it('shows offline without inventing a last seen time when older accounts lack one', () => {
    expect(getPresenceLabel({ status: 'offline' }, new Date('2026-10-15T12:00:00Z'))).toBe('Offline');
  });
});
