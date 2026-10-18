'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

export function MobileShiftSyncPrompt() {
  const [pending, setPending] = useState<MobileShift | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const bridge = window.teamseverDesktop;
    if (!bridge) return;
    let active = true;
    const refresh = async () => {
      try {
        const status = await bridge.getStatus();
        if (active) setPending(status.pendingMobileShift || null);
      } catch {
        // The desktop may not be paired yet; keep checking while the app is open.
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const respond = useCallback(async (action: SyncAction) => {
    if (!pending || submitting) return;
    const bridge = window.teamseverDesktop;
    if (!bridge) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await bridge.respondToMobileShift(pending.timeEntryId, action);
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
