import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopDownloadButton } from './DesktopDownloadButton';
import { getDesktopDownloadUrl, getLatestReleaseApiUrl } from './desktop-download';

describe('DesktopDownloadButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  function openPlatformMenu() {
    const trigger = screen.getByRole('button', { name: 'Download TeamsEver desktop app' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(trigger);
  }

  const windowsAsset = {
    name: 'TeamsEver-Setup.exe',
    browser_download_url: 'https://github.com/everpeaknp/teamsever-frontend/releases/download/v0.1.0/TeamsEver-Setup.exe',
  };
  const linuxAsset = {
    name: 'TeamsEver.AppImage',
    browser_download_url: 'https://github.com/everpeaknp/teamsever-frontend/releases/download/v0.1.0/TeamsEver.AppImage',
  };

  it('uses the latest release API for the configured public GitHub repo', () => {
    expect(getLatestReleaseApiUrl()).toBe(
      'https://api.github.com/repos/everpeaknp/teamsever-frontend/releases/latest',
    );
  });

  it('returns the Windows installer URL when Windows is explicitly selected', () => {
    expect(getDesktopDownloadUrl('windows', [windowsAsset, linuxAsset])).toBe(windowsAsset.browser_download_url);
  });

  it('returns the Linux AppImage URL when Linux is explicitly selected', () => {
    expect(getDesktopDownloadUrl('linux', [windowsAsset, linuxAsset])).toBe(linuxAsset.browser_download_url);
  });

  it('returns no download URL when the selected installer is missing', () => {
    expect(getDesktopDownloadUrl('windows', [linuxAsset])).toBeNull();
  });

  it('keeps the platform chooser available before the first release is published', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();
    expect(await screen.findByRole('menuitem', { name: /Windows/ })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Linux/ })).toBeDisabled();
  });

  it('offers Windows and Linux choices and downloads the selected asset directly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assets: [windowsAsset, linuxAsset] }),
    }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();

    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Windows (.exe)' })).toHaveAttribute('href', windowsAsset.browser_download_url));
    const windowsOption = screen.getByRole('menuitem', { name: 'Windows (.exe)' });
    const linuxOption = screen.getByRole('menuitem', { name: 'Linux (AppImage)' });
    expect(windowsOption).toHaveAttribute('href', windowsAsset.browser_download_url);
    expect(linuxOption).toHaveAttribute('href', linuxAsset.browser_download_url);
    expect(windowsOption).toHaveAttribute('download');
    expect(linuxOption).toHaveAttribute('download');
    expect(windowsOption).not.toHaveAttribute('target');
    expect(linuxOption).not.toHaveAttribute('target');
  });

  it('keeps both platform choices visible but disables downloads that are not published', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ assets: [linuxAsset] }),
    }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();

    const windowsOption = await screen.findByRole('menuitem', { name: /Windows/ });
    expect(windowsOption).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Linux (AppImage)' })).toHaveAttribute('href', linuxAsset.browser_download_url));
  });
});
