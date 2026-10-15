export interface PresenceSummary {
  status: 'online' | 'offline';
  lastSeen?: Date | string | null;
}

export function getPresenceLabel(presence: PresenceSummary | undefined, now = new Date()): string {
  if (!presence) return 'Status unavailable';
  if (presence.status === 'online') return 'Active now';

  if (!presence.lastSeen) return 'Status unavailable';

  const lastSeen = presence.lastSeen instanceof Date ? presence.lastSeen : new Date(presence.lastSeen);
  const elapsedMs = now.getTime() - lastSeen.getTime();
  if (!Number.isFinite(lastSeen.getTime()) || elapsedMs < 0) return 'Status unavailable';

  const elapsedMinutes = Math.floor(elapsedMs / 60_000);
  if (elapsedMinutes < 1) return 'Active just now';
  if (elapsedMinutes < 60) return `Active ${elapsedMinutes} ${elapsedMinutes === 1 ? 'minute' : 'minutes'} ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Active ${elapsedHours} ${elapsedHours === 1 ? 'hour' : 'hours'} ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `Active ${elapsedDays} ${elapsedDays === 1 ? 'day' : 'days'} ago`;
}
