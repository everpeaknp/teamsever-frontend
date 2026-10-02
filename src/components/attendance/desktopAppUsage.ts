export type AppUsageEvent = { appId?: string | null; startedAt: string; endedAt: string; timeEntry?: string };
export type AppUsageGap = { gapStartedAt: string; gapEndedAt: string };
export type AppUsageSummary = { appId: string; label: string; sessions: number; durationMs: number };

export function summarizeDesktopAppUsage(events: AppUsageEvent[], gaps: AppUsageGap[] = []): AppUsageSummary[] {
  const ordered = events.filter((event) => !!event.appId && Number.isFinite(Date.parse(event.startedAt)) && Number.isFinite(Date.parse(event.endedAt)))
    .slice().sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const appSessions: Array<{ appId: string; startedAt: number; endedAt: number; timeEntry?: string }> = [];
  for (const event of ordered) {
    const appId = event.appId!.trim().toLowerCase().replace(/\.exe$/i, '');
    if (!appId) continue;
    const start = Date.parse(event.startedAt);
    const end = Math.max(start, Date.parse(event.endedAt));
    const previous = appSessions[appSessions.length - 1];
    const gapBetween = previous && gaps.some((gap) => Date.parse(gap.gapStartedAt) <= start && Date.parse(gap.gapEndedAt) >= previous.endedAt);
    if (previous && previous.appId === appId && previous.timeEntry === event.timeEntry && start - previous.endedAt <= 90_000 && !gapBetween) {
      previous.endedAt = Math.max(previous.endedAt, end);
    } else {
      appSessions.push({ appId, startedAt: start, endedAt: end, timeEntry: event.timeEntry });
    }
  }
  const usage = new Map<string, AppUsageSummary>();
  for (const session of appSessions) {
    const current = usage.get(session.appId) || { appId: session.appId, label: formatAppLabel(session.appId), sessions: 0, durationMs: 0 };
    current.sessions += 1;
    current.durationMs += session.endedAt - session.startedAt;
    usage.set(session.appId, current);
  }
  return Array.from(usage.values()).sort((a, b) => b.durationMs - a.durationMs || a.label.localeCompare(b.label));
}

export function formatAppLabel(appId: string): string {
  const name = appId.toLowerCase().replace(/\.exe$/i, '').replace(/[-_]+/g, ' ').trim();
  const aliases: Record<string, string> = {
    code: 'Visual Studio Code', 'code insiders': 'Visual Studio Code Insiders', chrome: 'Google Chrome',
    brave: 'Brave', firefox: 'Firefox', msedge: 'Microsoft Edge', kiro: 'Kiro',
    antigravity: 'Antigravity', devenv: 'Visual Studio', idea: 'IntelliJ IDEA', webstorm: 'WebStorm',
    pycharm: 'PyCharm', teams: 'Microsoft Teams', slack: 'Slack',
  };
  return aliases[name] || name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Unknown app';
}

export function formatAppDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function formatAppTimer(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((part) => String(part).padStart(2, '0')).join(':');
}
