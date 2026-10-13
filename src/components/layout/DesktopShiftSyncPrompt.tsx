'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { ensureTrustedDesktopDevice } from '@/lib/desktopAttendance';

type ShiftStatus = {
  clockedIn: boolean;
  clockedInOnThisDevice: boolean;
  presenceTrackingActive: boolean;
  clockInSource?: 'web' | 'mobile' | 'desktop' | null;
  timeEntryId: string | null;
  canAttachPresence: boolean;
};

export function DesktopShiftSyncPrompt() {
  useEffect(() => {
    const desktop = window.teamseverDesktop;
    if (!desktop?.getStatus || !desktop.attachPresenceToActiveShift) return;
    let cancelled = false;
    let checking = false;
    let attaching = false;
    let handledShiftId: string | null = null;
    let retryAt = 0;
    let retryDelay = 20_000;

    const checkForShift = async () => {
      if (checking || attaching) return;
      checking = true;
      try {
        // Registering a trusted installation doesn't start tracking. Tracking
        // is attached only to the account's active mobile shift.
        const device = await ensureTrustedDesktopDevice();
        if (!device) return;
        const status: ShiftStatus = await desktop.getStatus();
        if (cancelled) return;
        if (!status.clockedIn) { handledShiftId = null; retryAt = 0; retryDelay = 20_000; }

        const eligible = status.clockedIn
          && !status.presenceTrackingActive
          && !status.clockedInOnThisDevice
          && status.clockInSource === 'mobile'
          && status.canAttachPresence
          && !!status.timeEntryId;
        if (!eligible || status.timeEntryId === handledShiftId || Date.now() < retryAt) return;

        const timeEntryId = status.timeEntryId!;
        handledShiftId = timeEntryId;
        attaching = true;
        const result = await desktop.attachPresenceToActiveShift();
        if (!result.attached) throw new Error('Could not attach this laptop to the active mobile shift.');
        retryAt = 0;
        retryDelay = 20_000;
      } catch (cause: any) {
        handledShiftId = null;
        retryAt = Date.now() + retryDelay;
        retryDelay = Math.min(retryDelay * 2, 5 * 60_000);
        if (!cancelled) toast.error('Desktop tracking could not start', {
          description: cause?.response?.data?.message || cause?.message || 'TeamsEver will retry automatically while the shift is active.',
          duration: 8_000,
        });
      } finally {
        attaching = false;
        checking = false;
      }
    };

    void checkForShift();
    const poll = window.setInterval(() => void checkForShift(), 20_000);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, []);

  return null;
}
