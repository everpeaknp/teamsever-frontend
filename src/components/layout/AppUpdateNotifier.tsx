'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

const UPDATE_CHECK_INTERVAL_MS = 60_000;

interface AppUpdateNotifierProps {
  currentBuildId?: string;
  pollIntervalMs?: number;
}

export function AppUpdateNotifier({
  currentBuildId = process.env.NEXT_PUBLIC_APP_BUILD_ID || 'development',
  pollIntervalMs = UPDATE_CHECK_INTERVAL_MS,
}: AppUpdateNotifierProps) {
  useEffect(() => {
    let stopped = false;
    let requestInFlight = false;
    let updateNotified = false;

    const checkForUpdate = async () => {
      if (stopped || requestInFlight || document.visibilityState === 'hidden') return;
      requestInFlight = true;

      try {
        const response = await fetch('/api/app-version', { cache: 'no-store' });
        if (!response.ok || stopped) return;

        const data = await response.json();
        if (typeof data.version !== 'string' || !data.version || data.version === currentBuildId || updateNotified) return;

        updateNotified = true;
        toast('TeamsEver has been updated', {
          id: 'teamsever-app-update',
          description: 'Refresh to load the latest version.',
          duration: Infinity,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload(),
          },
        });
      } catch {
        // A temporary version-check failure should not interrupt app use.
      } finally {
        requestInFlight = false;
      }
    };

    const interval = window.setInterval(() => void checkForUpdate(), pollIntervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkForUpdate();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    void checkForUpdate();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentBuildId, pollIntervalMs]);

  return null;
}
