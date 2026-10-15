export interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'offline';
  lastSeen?: Date | null;
}

interface PresenceEntry {
  userId?: string;
  status?: 'online' | 'offline';
  lastSeen?: string | Date | null;
  user?: { _id?: string; name?: string };
}

export function normalizeWorkspacePresence(data: {
  onlineUsers?: PresenceEntry[];
  offlineUsers?: PresenceEntry[];
}): { onlineUsers: string[]; userPresence: Map<string, UserPresence> } {
  const userPresence = new Map<string, UserPresence>();

  for (const [entries, fallbackStatus] of [
    [data.onlineUsers ?? [], 'online'],
    [data.offlineUsers ?? [], 'offline'],
  ] as const) {
    for (const entry of entries) {
      const userId = entry.userId || entry.user?._id;
      if (!userId) continue;

      const lastSeen = entry.lastSeen ? new Date(entry.lastSeen) : null;
      userPresence.set(userId, {
        userId,
        userName: entry.user?.name ?? '',
        status: entry.status ?? fallbackStatus,
        lastSeen: lastSeen && Number.isFinite(lastSeen.getTime()) ? lastSeen : null,
      });
    }
  }

  return {
    onlineUsers: Array.from(userPresence.values())
      .filter((presence) => presence.status === 'online')
      .map((presence) => presence.userId),
    userPresence,
  };
}
