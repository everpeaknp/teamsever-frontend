'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { DesktopUpdateState } from '@/types/desktop';

const UPDATE_TOAST_ID = 'teamsever-desktop-update';

export function DesktopUpdateNotifier() {
  useEffect(() => {
    const bridge = window.teamseverDesktop;
    if (!bridge?.onUpdateState || !bridge.getUpdateState) return;

    let stopped = false;
    let eventRevision = 0;
    const showState = (state: DesktopUpdateState | null) => {
      if (stopped || !state) return;
      switch (state.type) {
        case 'checking':
          return;
        case 'available':
          toast.message('TeamsEver update found', {
            id: UPDATE_TOAST_ID,
            description: `Version ${state.version} is downloading in the background.`,
            duration: 5_000,
          });
          return;
        case 'downloading':
          toast.loading('Downloading TeamsEver update', {
            id: UPDATE_TOAST_ID,
            description: `${state.percent}%`,
            duration: Infinity,
          });
          return;
        case 'downloaded':
          toast.dismiss(UPDATE_TOAST_ID);
          toast('TeamsEver update is ready', {
            id: UPDATE_TOAST_ID,
            description: `Version ${state.version} will install when you restart or close the app.`,
            duration: Infinity,
            action: {
              label: 'Restart to update',
              onClick: () => { void bridge.installUpdate?.().catch(() => toast.error('Could not start the desktop update. Please try again.')); },
            },
            cancel: { label: 'Later', onClick: () => toast.dismiss(UPDATE_TOAST_ID) },
          });
          return;
        case 'deferred':
          toast.dismiss(UPDATE_TOAST_ID);
          toast.warning(
            state.reason === 'clocked-in' ? 'Update will install after you clock out' : 'TeamsEver could not verify your clock status',
            { description: state.reason === 'clocked-in' ? 'Your shift stays active. Restart after clocking out to install the update.' : 'The update was not installed. Try again when your connection is available.', duration: 10_000 },
          );
          return;
        case 'error':
          toast.dismiss(UPDATE_TOAST_ID);
          toast.error(state.message, {
            duration: Infinity,
            action: {
              label: 'Download latest version',
              onClick: () => { void bridge.openLatestDownload?.().catch(() => toast.error('Could not open the desktop download.')); },
            },
          });
          return;
        case 'not-available':
          toast.dismiss(UPDATE_TOAST_ID);
      }
    };

    const unsubscribe = bridge.onUpdateState((state) => {
      eventRevision += 1;
      showState(state);
    });
    const snapshotRevision = eventRevision;
    void bridge.getUpdateState().then((state) => {
      if (eventRevision === snapshotRevision) showState(state);
    }).catch(() => undefined);

    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);

  return null;
}
