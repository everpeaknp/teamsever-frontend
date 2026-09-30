export type PresenceStatus = 'active' | 'afk' | 'unavailable';

export interface TrackerCapability {
  supported: boolean;
  reason?: string;
}

export interface PresenceCapabilities {
  foregroundApp: TrackerCapability;
  idleDetection: TrackerCapability;
}

export function normalizeAppId(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  return /^[a-z0-9._+-]{1,160}$/.test(normalized) ? normalized : null;
}

export function classifyPresence(idleSeconds: number | null | undefined, thresholdMinutes: number): PresenceStatus {
  if (typeof idleSeconds !== 'number' || !Number.isFinite(idleSeconds) || idleSeconds < 0) return 'unavailable';
  const threshold = Number.isInteger(thresholdMinutes) && thresholdMinutes >= 1 && thresholdMinutes <= 60
    ? thresholdMinutes
    : 5;
  return idleSeconds >= threshold * 60 ? 'afk' : 'active';
}

export async function detectPresenceCapabilities(
  detectForegroundApp: () => Promise<TrackerCapability>,
  readSystemIdleSeconds: () => number,
): Promise<PresenceCapabilities> {
  const [foregroundApp, idleDetection] = await Promise.all([
    Promise.resolve().then(detectForegroundApp).catch((error: unknown) => ({
      supported: false,
      reason: error instanceof Error ? error.message : 'Foreground app detection is unavailable.',
    })),
    Promise.resolve().then(() => {
      const idleSeconds = readSystemIdleSeconds();
      return Number.isFinite(idleSeconds) && idleSeconds >= 0
        ? { supported: true }
        : { supported: false, reason: 'System idle detection is unavailable.' };
    }).catch(() => ({ supported: false, reason: 'System idle detection is unavailable.' })),
  ]);

  return { foregroundApp, idleDetection };
}

export function canMonitorForegroundApps(input: { enabled: boolean; clockedIn: boolean; platform: string; wayland: boolean }): boolean {
  return input.enabled && input.clockedIn && (input.platform === 'win32' || (input.platform === 'linux' && !input.wayland));
}

export function isWaylandSession(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.XDG_SESSION_TYPE?.toLowerCase() === 'wayland' || (!!env.WAYLAND_DISPLAY && !env.DISPLAY);
}