'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { getDesktopDownloadUrl, getLatestReleaseApiUrl } from './desktop-download';

export function DesktopDownloadButton() {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = getLatestReleaseApiUrl();
    if (!apiUrl) return;

    const controller = new AbortController();
    fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((release) => {
        if (!release || !Array.isArray(release.assets)) return;
        setDownloadUrl(getDesktopDownloadUrl(navigator.platform, release.assets));
      })
      .catch(() => {
        // Keep the download disabled when GitHub cannot confirm a published installer.
      });

    return () => controller.abort();
  }, []);

  if (!downloadUrl) {
    return (
      <button
        type="button"
        aria-label="Download TeamsEver desktop app (coming soon)"
        title="Desktop app coming soon"
        disabled
        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-400 dark:text-slate-600 cursor-not-allowed"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <a
      href={downloadUrl}
      download
      aria-label="Download TeamsEver desktop app"
      title="Download TeamsEver desktop app"
      className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#262626]"
    >
      <Download className="h-5 w-5" aria-hidden="true" />
    </a>
  );
}
