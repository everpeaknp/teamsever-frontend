'use client';

import { useEffect, useId, useState } from 'react';
import { Download } from 'lucide-react';
import { getDesktopDownloadUrl, getDesktopDownloadsApiUrl } from './desktop-download';

export function DesktopDownloadButton() {
  const [availablePlatforms, setAvailablePlatforms] = useState<{ windows: boolean; linux: boolean }>({ windows: false, linux: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch(getDesktopDownloadsApiUrl(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const assets = payload?.data?.assets;
        if (!assets) return;
        setAvailablePlatforms({ windows: assets.windows === true, linux: assets.linux === true });
      })
      .catch(() => {
        // Keep platform choices visible but unavailable until a published installer can be confirmed.
      });

    return () => controller.abort();
  }, []);

  const windowsUrl = availablePlatforms.windows ? getDesktopDownloadUrl('windows') : null;
  const linuxUrl = availablePlatforms.linux ? getDesktopDownloadUrl('linux') : null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Download TeamsEver desktop app"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        title="Choose Windows or Linux"
        onClick={() => setMenuOpen((open) => !open)}
        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#262626]"
      >
        <Download className="h-5 w-5" aria-hidden="true" />
      </button>
      {menuOpen && (
        <div id={menuId} role="menu" aria-label="Desktop download options" className="absolute right-0 z-50 mt-2 min-w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          <div className="px-2 py-1.5 text-sm font-semibold">Choose your platform</div>
          {windowsUrl ? (
            <a role="menuitem" href={windowsUrl} download onClick={() => setMenuOpen(false)} className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent">
              Windows (.exe)
            </a>
          ) : (
            <button role="menuitem" type="button" disabled className="flex w-full cursor-not-allowed items-center rounded-sm px-2 py-1.5 text-left text-sm opacity-50">
              Windows (.exe) — unavailable
            </button>
          )}
          {linuxUrl ? (
            <a role="menuitem" href={linuxUrl} download onClick={() => setMenuOpen(false)} className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent">
              Linux (AppImage)
            </a>
          ) : (
            <button role="menuitem" type="button" disabled className="flex w-full cursor-not-allowed items-center rounded-sm px-2 py-1.5 text-left text-sm opacity-50">
              Linux (AppImage) — unavailable
            </button>
          )}
        </div>
      )}
    </div>
  );
}
