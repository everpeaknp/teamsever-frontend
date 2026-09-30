export function normalizeAppId(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  return /^[a-z0-9._+-]{1,160}$/.test(normalized) ? normalized : null;
}

export function canMonitorForegroundApps(input: { enabled: boolean; clockedIn: boolean; platform: string; wayland: boolean }): boolean {
  return input.enabled && input.clockedIn && (input.platform === 'win32' || (input.platform === 'linux' && !input.wayland));
}

export function isWaylandSession(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.XDG_SESSION_TYPE?.toLowerCase() === 'wayland' || (!!env.WAYLAND_DISPLAY && !env.DISPLAY);
}
