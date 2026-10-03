export type DesktopPlatform = 'windows' | 'linux';

/** Public API endpoint used for both release discovery and the installer stream. */
export function getDesktopDownloadsApiUrl(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const apiRoot = configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/i, '');
  return `${apiRoot}/api/desktop-downloads`;
}

export function getDesktopDownloadUrl(platform: DesktopPlatform): string {
  return `${getDesktopDownloadsApiUrl()}/${platform}`;
}
