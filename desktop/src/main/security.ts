const LOCAL_DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isAllowedWebUrl(value: string, isPackaged: boolean): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (url.protocol === 'https:') return true;
    return !isPackaged && url.protocol === 'http:' && LOCAL_DEVELOPMENT_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function isSameOriginNavigation(value: string, appOrigin: string): boolean {
  try {
    const url = new URL(value);
    return !url.username && !url.password && url.origin === appOrigin;
  } catch {
    return false;
  }
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
