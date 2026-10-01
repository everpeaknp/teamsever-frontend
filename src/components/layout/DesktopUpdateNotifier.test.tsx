import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopUpdateNotifier } from './DesktopUpdateNotifier';
import type { DesktopUpdateState } from '@/types/desktop';

const { mockToast } = vi.hoisted(() => ({
  mockToast: Object.assign(vi.fn(), {
    loading: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn(), message: vi.fn(), dismiss: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: mockToast }));

function createBridge(initialState: DesktopUpdateState | null = null) {
  let listener: ((state: DesktopUpdateState) => void) | null = null;
  const bridge = {
    onUpdateState: vi.fn((callback: (state: DesktopUpdateState) => void) => {
      listener = callback;
      return () => { listener = null; };
    }),
    getUpdateState: vi.fn(async () => initialState),
    installUpdate: vi.fn(async () => true),
    checkForUpdates: vi.fn(async () => null),
    openLatestDownload: vi.fn(async () => undefined),
  };
  return { bridge, emit: (state: DesktopUpdateState) => listener?.(state) };
}

describe('DesktopUpdateNotifier', () => {
  beforeEach(() => {
    mockToast.mockClear();
    for (const method of ['loading', 'success', 'warning', 'error', 'message', 'dismiss'] as const) mockToast[method].mockClear();
    delete window.teamseverDesktop;
  });

  it('does nothing in a regular browser without the Electron bridge', () => {
    render(<DesktopUpdateNotifier />);
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockToast.loading).not.toHaveBeenCalled();
  });

  it('shows background download progress from the initial update state', async () => {
    const { bridge } = createBridge({ type: 'downloading', percent: 43 });
    window.teamseverDesktop = bridge as any;
    render(<DesktopUpdateNotifier />);
    await waitFor(() => expect(mockToast.loading).toHaveBeenCalledWith('Downloading TeamsEver update', expect.objectContaining({ description: '43%' })));
  });

  it('offers a restart action when an update has finished downloading', async () => {
    const { bridge, emit } = createBridge();
    window.teamseverDesktop = bridge as any;
    render(<DesktopUpdateNotifier />);
    act(() => emit({ type: 'downloaded', version: '0.1.5' }));
    expect(mockToast).toHaveBeenCalledWith('TeamsEver update is ready', expect.objectContaining({
      action: expect.objectContaining({ label: 'Restart to update' }),
      cancel: expect.objectContaining({ label: 'Later' }),
    }));
  });

  it('explains that installation waits for clock-out', async () => {
    const { bridge, emit } = createBridge();
    window.teamseverDesktop = bridge as any;
    render(<DesktopUpdateNotifier />);
    act(() => emit({ type: 'deferred', version: '0.1.5', reason: 'clocked-in' }));
    expect(mockToast.warning).toHaveBeenCalledWith('Update will install after you clock out', expect.any(Object));
  });

  it('opens the fixed platform download fallback when update checking fails', async () => {
    const { bridge, emit } = createBridge();
    window.teamseverDesktop = bridge as any;
    render(<DesktopUpdateNotifier />);
    act(() => emit({ type: 'error', message: 'Could not check for desktop updates. You can download the latest version manually.' }));
    const options = mockToast.error.mock.calls[0]?.[1];
    expect(options.action.label).toBe('Download latest version');
    await act(async () => options.action.onClick());
    expect(bridge.openLatestDownload).toHaveBeenCalledOnce();
  });
});
