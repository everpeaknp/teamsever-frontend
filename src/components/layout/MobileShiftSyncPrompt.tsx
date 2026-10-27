'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getDesktopPresencePreference, ensureTrustedDesktopDevice } from '@/lib/desktopAttendance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type MobileShift = { timeEntryId: string; workspaceId: string; startTime: string };
type SyncAction = 'sync_once' | 'always' | 'not_now';
const dismissedMobileShiftStorageKey = 'teamsever:desktop:dismissed-mobile-shift';

export function MobileShiftSyncPrompt() {
  const [pending, setPending] = useState<MobileShift | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dismissedShiftId = useRef<string | null>(null);

  useEffect(() => {
    const bridge = window.teamseverDesktop;
    if (!bridge) return;
    let active = true;
    try {
      dismissedShiftId.current = window.localStorage.getItem(dismissedMobileShiftStorageKey);
    } catch {
      dismissedShiftId.current = null;
    }
    let refreshInFlight = false;
    const refresh = async () => {
      if (refreshInFlight || document.visibilityState === 'hidden') return;
      refreshInFlight = true;
      try {
        const enabled = await getDesktopPresencePreference();
        if (!active) return;
        if (!enabled) {
          setPending(null);
          await bridge.setMonitoringEnabled(false).catch(() => undefined);
          return;
        }
        // Registration establishes the device credential before the main
        // process can poll status. Provisioning never starts presence tracking;
        // status + per-shift consent remain the only activation path.
        await ensureTrustedDesktopDevice();
        const status = await bridge.getStatus();
        if (!active) return;
        const nextPending = status.pendingMobileShift || null;
        setPending(nextPending?.timeEntryId === dismissedShiftId.current ? null : nextPending);
      } catch {
        // Keep bounded polling so a network/auth recovery can provision and retry.
      } finally {
        refreshInFlight = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('teamsever:desktop-presence-preference-changed', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('teamsever:desktop-presence-preference-changed', refresh);
    };
  }, []);

  const respond = useCallback(async (action: SyncAction) => {
    if (!pending || submitting) return;
    const bridge = window.teamseverDesktop;
    if (!bridge) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await bridge.respondToMobileShift(pending.timeEntryId, action);
      if (action === 'not_now') {
        dismissedShiftId.current = pending.timeEntryId;
        try {
          window.localStorage.setItem(dismissedMobileShiftStorageKey, pending.timeEntryId);
        } catch {
          // Keep the dismissal for this renderer session even when storage is unavailable.
        }
      }
      setPending(null);
      if (action === 'not_now') toast.message('Desktop presence was not linked to this mobile shift.');
      else if (result.synced) toast.success('Desktop presence linked to this mobile shift.');
    } catch (cause: any) {
      setError(cause?.message || 'Could not update mobile shift sync. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [pending, submitting]);

  if (!pending) return null;

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-lg"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}

      >
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:mx-0">
            <Activity aria-hidden="true" className="h-6 w-6" />
          </div>
          <DialogTitle>Mobile shift found</DialogTitle>
          <DialogDescription>
            You are clocked in from the TeamsEver mobile app on this network. Would you like to share desktop presence for this shift?
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>When synced, TeamsEver reports foreground app names and Active/AFK state from this trusted desktop. It does not record keystrokes, text, mouse details, window titles, URLs, or screenshots.</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:flex-wrap sm:space-x-0">
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => void respond('not_now')}>
            Not now
          </Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => void respond('sync_once')}>
            Sync this time
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void respond('always')}>
            {submitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Always sync future mobile shifts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
