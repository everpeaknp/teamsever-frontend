const RELEASES_URL = (
  process.env.NEXT_PUBLIC_DESKTOP_RELEASES_URL ||
  'https://github.com/everpeaknp/teamsever-frontend/releases'
).replace(/\/$/, '');

export interface DesktopReleaseAsset {
  name: string;
  browser_download_url: string;
}

export function getLatestReleaseApiUrl(): string | null {
  try {
    const releaseUrl = new URL(RELEASES_URL);
    const [owner, repository, releasesPath] = releaseUrl.pathname.split('/').filter(Boolean);
    if (releaseUrl.hostname !== 'github.com' || releasesPath !== 'releases') return null;
    return `https://api.github.com/repos/${owner}/${repository}/releases/latest`;
  } catch {
    return null;
  }
}

export function getDesktopDownloadUrl(platform: string, assets: DesktopReleaseAsset[]): string | null {
  const normalizedPlatform = platform.toLowerCase();
  const expectedAsset = normalizedPlatform.startsWith('win')
    ? 'TeamsEver-Setup.exe'
    : normalizedPlatform.startsWith('linux')
      ? 'TeamsEver.AppImage'
      : null;

  if (!expectedAsset) return null;

  const asset = assets.find((item) => item.name === expectedAsset);
  if (!asset) return null;

  try {
    const assetUrl = new URL(asset.browser_download_url);
    if (assetUrl.protocol === 'https:' && assetUrl.hostname === 'github.com') {
      return assetUrl.toString();
    }
  } catch {
    // Treat malformed release metadata as a missing installer.
  }

  return null;
}
