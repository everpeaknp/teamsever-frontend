export function readAnalyticsCacheForUser(
  raw: string | null,
  currentUserId: string | null,
  now: number,
  maxAgeMs: number,
): Record<string, any> | null {
  if (!raw || !currentUserId) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const cached = value as Record<string, any>;
    if (cached.userId !== currentUserId ||
        typeof cached.timestamp !== 'number' ||
        now < cached.timestamp ||
        now - cached.timestamp >= maxAgeMs ||
        !Array.isArray(cached.members) ||
        cached.members.length === 0) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

export function clearAnalyticsCache(storage: Pick<Storage, 'length' | 'key' | 'removeItem'>): void {
  for (let index = storage.length - 1; index >= 0; index--) {
    const key = storage.key(index);
    if (key?.startsWith('analytics_cache_')) storage.removeItem(key);
  }
}
