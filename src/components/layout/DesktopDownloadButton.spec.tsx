import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopDownloadButton } from './DesktopDownloadButton';
import { getDesktopDownloadUrl, getDesktopDownloadsApiUrl } from './desktop-download';

describe('DesktopDownloadButton', () => {
  afterEach(() => vi.unstubAllGlobals());

  function openPlatformMenu() {
    const trigger = screen.getByRole('button', { name: 'Download TeamsEver desktop app' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(trigger);
  }

  it('uses the configured TeamsEver API for discovery and installer downloads', () => {
    expect(getDesktopDownloadsApiUrl()).toMatch(/\/api\/desktop-downloads$/);
    expect(getDesktopDownloadUrl('windows')).toBe(`${getDesktopDownloadsApiUrl()}/windows`);
    expect(getDesktopDownloadUrl('linux')).toBe(`${getDesktopDownloadsApiUrl()}/linux`);
    expect(getDesktopDownloadUrl('windows')).not.toContain('github.com');
  });

  it('keeps platform choices visible but unavailable if release discovery fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();
    expect(await screen.findByRole('menuitem', { name: /Windows/ })).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /Linux/ })).toBeDisabled();
  });

  it('offers available platforms and points downloads to the app API, never GitHub', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { version: '0.2.3', assets: { windows: true, linux: true } } }),
    }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();

    const windowsOption = await screen.findByRole('menuitem', { name: 'Windows (.exe)' });
    const linuxOption = screen.getByRole('menuitem', { name: 'Linux (AppImage)' });
    expect(windowsOption).toHaveAttribute('href', getDesktopDownloadUrl('windows'));
    expect(linuxOption).toHaveAttribute('href', getDesktopDownloadUrl('linux'));
    expect(windowsOption.getAttribute('href')).not.toContain('github.com');
    expect(linuxOption.getAttribute('href')).not.toContain('github.com');
    expect(windowsOption).toHaveAttribute('download');
    expect(linuxOption).toHaveAttribute('download');
    expect(windowsOption).not.toHaveAttribute('target');
    expect(linuxOption).not.toHaveAttribute('target');
  });

  it('disables only platforms that are not published', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { version: '0.2.3', assets: { windows: false, linux: true } } }),
    }));
    render(<DesktopDownloadButton />);

    openPlatformMenu();

    expect(await screen.findByRole('menuitem', { name: /Windows/ })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Linux (AppImage)' })).toHaveAttribute('href', getDesktopDownloadUrl('linux')));
  });
});
