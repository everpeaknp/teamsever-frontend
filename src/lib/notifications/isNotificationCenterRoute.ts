export function isNotificationCenterRoute(pathname?: string): boolean {
  const path = pathname ?? (typeof window === 'undefined' ? '' : window.location.pathname);
  return path === '/notifications' ||
    path.startsWith('/notifications/') ||
    /^\/workspace\/[^/]+\/notifications(?:\/|$)/.test(path);
}
