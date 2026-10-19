'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Activity, AppWindow, Clock, RefreshCw, StopCircle, Building2, House } from 'lucide-react';
import { api } from '@/lib/axios';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useProfileModalStore } from '@/store/useProfileModalStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatAppLabel } from './desktopAppUsage';
import { DesktopAppIcon } from './DesktopAppIcon';

type ActiveTimer = {
  _id: string;
  startTime: string;
  currentDuration: number;
  attendanceMode?: 'onsite' | 'remote';
  user?: { _id?: string; name?: string; email?: string; avatar?: string; profilePicture?: string };
};

type ClockStatus = {
  scope: 'self' | 'workspace';
  canManageTeam: boolean;
  activeTimers: ActiveTimer[];
};

type CurrentDesktopPresence = {
  appId: string | null;
  presenceStatus: 'active' | 'afk';
  reportedAt: string;
};

function ElapsedAttendanceDuration({ timer }: { timer: ActiveTimer }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(ticker);
  }, []);

  const seconds = Math.max(timer.currentDuration || 0, Math.floor((now - new Date(timer.startTime).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return <>{hours}h {minutes}m {remainingSeconds}s</>;
}

export function LiveAttendanceTimers({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [desktopPresence, setDesktopPresence] = useState<Record<string, CurrentDesktopPresence>>({});
  const [error, setError] = useState('');
  const [refreshingPresence, setRefreshingPresence] = useState(false);
  const presenceRequest = useRef(0);
  const presenceInFlight = useRef(false);
  const [selectedTimer, setSelectedTimer] = useState<ActiveTimer | null>(null);
  const [stopping, setStopping] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const openProfile = useProfileModalStore((state) => state.openProfile);

  const refreshDesktopPresence = useCallback(async (clockStatus: ClockStatus, showSpinner = false) => {
    if (presenceInFlight.current) return;
    const userIds = Array.from(new Set(clockStatus.activeTimers.map((timer) => timer.user?._id).filter((id): id is string => !!id)));
    const requestId = ++presenceRequest.current;
    if (clockStatus.scope !== 'workspace' || userIds.length === 0) {
      setDesktopPresence({});
      setRefreshingPresence(false);
      return;
    }
    presenceInFlight.current = true;
    if (showSpinner) setRefreshingPresence(true);
    try {
      const query = new URLSearchParams({ userIds: userIds.join(','), pageSize: String(userIds.length), _refresh: String(Date.now()) });
      const { data } = await api.get(`/attendance/workspace/${workspaceId}/desktop-presence/current?${query}`, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const members = data?.data?.members;
      const nextPresence: Record<string, CurrentDesktopPresence> = {};
      if (Array.isArray(members)) {
        for (const member of members) {
          const presence = member?.presence;
          if (member?.userId
            && (presence?.presenceStatus === 'active' || presence?.presenceStatus === 'afk')
            && typeof presence.reportedAt === 'string'
            && Number.isFinite(Date.parse(presence.reportedAt))) {
            nextPresence[member.userId] = presence;
          }
        }
      }
      if (requestId === presenceRequest.current) {
        setDesktopPresence((current) => {
          const currentUserIds = Object.keys(current);
          const nextUserIds = Object.keys(nextPresence);
          const unchanged = currentUserIds.length === nextUserIds.length && nextUserIds.every((userId) => {
            const previous = current[userId];
            const next = nextPresence[userId];
            return previous?.appId === next.appId
              && previous?.presenceStatus === next.presenceStatus
              && previous?.reportedAt != null
              && format(new Date(previous.reportedAt), 'h:mm a') === format(new Date(next.reportedAt), 'h:mm a');
          });
          return unchanged ? current : nextPresence;
        });
      }
    } catch {
      // Desktop app reporting is optional; clock-in status remains authoritative.
    } finally {
      if (requestId === presenceRequest.current) setRefreshingPresence(false);
      presenceInFlight.current = false;
    }
  }, [workspaceId]);

  const refreshClockStatus = useCallback(async () => {
    try {
      let nextStatus: ClockStatus;
      try {
        const response = await api.get(`/time/workspace/${workspaceId}/clock-status`);
        nextStatus = response.data.data;
      } catch (cause: any) {
        // Older API processes may not have the shared clock-status route yet.
        // Admins can still use the dashboard's existing authoritative roster API.
        if (cause.response?.status !== 404) throw cause;
        const response = await api.get(`/time/admin/workspace/${workspaceId}/active`);
        nextStatus = {
          scope: 'workspace',
          canManageTeam: true,
          activeTimers: response.data.data.activeTimers || [],
        };
      }
      setStatus(nextStatus);
      setError('');
    } catch (cause: any) {
      setError(cause.response?.data?.message || 'Could not load current clock-in status.');
    }
  }, [workspaceId]);

  useEffect(() => {
    void refreshClockStatus();
    const poll = window.setInterval(() => void refreshClockStatus(), 30_000);
    return () => window.clearInterval(poll);
  }, [refreshClockStatus]);

  const presenceUserIds = status?.scope === 'workspace'
    ? Array.from(new Set(status.activeTimers.map((timer) => timer.user?._id).filter((id): id is string => !!id))).join(',')
    : '';

  useEffect(() => {
    if (!status) return;
    if (status.scope !== 'workspace' || !presenceUserIds) {
      setDesktopPresence({});
      return;
    }

    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshDesktopPresence(status);
    };
    refresh();
    const poll = window.setInterval(refresh, 5_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      presenceRequest.current += 1;
      setRefreshingPresence(false);
    };
  }, [presenceUserIds, refreshDesktopPresence, status]);

  const confirmClockOut = async () => {
    if (!selectedTimer) return;
    setStopping(true);
    try {
      await api.post(`/time/admin/stop/${selectedTimer._id}`, { reason: stopReason.trim() || 'Admin clock-out from Attendance' });
      setSelectedTimer(null);
      setStopReason('');
      await refreshClockStatus();
    } catch (cause: any) {
      setError(cause.response?.data?.message || 'Could not clock out this member. Refresh and try again.');
    } finally {
      setStopping(false);
    }
  };

  const timers = status?.activeTimers ?? [];
  const memberName = (timer: ActiveTimer) => timer.user?.name?.trim() || 'Workspace member';

  return <>
    <section aria-label="Current attendance" className="border-b px-3 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="h-4 w-4 shrink-0 text-emerald-500" />
          <h3 className="font-semibold">{status?.scope === 'self' ? 'Your current shift' : 'Currently clocked in'}</h3>
          {status && <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            {timers.length} {timers.length === 1 ? 'person' : 'people'}
          </Badge>}
          <span className="hidden text-sm text-muted-foreground sm:inline">Live · app presence updates every 5 seconds</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => status && void refreshDesktopPresence(status, true)} disabled={!status || status.scope !== 'workspace' || refreshingPresence} aria-label="Refresh current desktop presence">
          <RefreshCw className={`h-4 w-4 ${refreshingPresence ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">{error}</p>}
      {!status && !error && <p className="mt-2 text-sm text-muted-foreground">Loading live status…</p>}
      {status && timers.length === 0 && <p className="mt-2 text-sm text-muted-foreground">
        {status.scope === 'self' ? 'You are not clocked in.' : 'No one is currently clocked in.'}
      </p>}
      {status && timers.length > 0 && <div className="mt-3 divide-y">
        {timers.map((timer) => {
          const name = memberName(timer);
          const startedAt = new Date(timer.startTime);
          const presence = timer.user?._id ? desktopPresence[timer.user._id] : undefined;
          return <div key={timer._id} className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    user={timer.user}
                    className="h-10 w-10 shrink-0"
                    disableProfileClick={!timer.user?._id}
                  />
                  <div className="min-w-0">
                    <button
                      type="button"
                      aria-label={`View ${name} profile`}
                      disabled={!timer.user?._id}
                      onClick={() => timer.user?._id && openProfile(timer.user._id)}
                      className="block max-w-full truncate text-left font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                    >
                      {name}
                    </button>
                    {timer.user?.email && <p className="truncate text-xs text-muted-foreground">{timer.user.email}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">Started {format(startedAt, 'MMM d, h:mm a')} · {formatDistanceToNowStrict(startedAt, { addSuffix: true })}</p>
                    {presence ? <div data-testid="presence-location-row" className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-4 text-muted-foreground">
                      <span className="flex min-w-0 flex-wrap items-center gap-1" aria-label={`Currently using ${presence.appId ? formatAppLabel(presence.appId) : 'an unavailable app'}, ${presence.presenceStatus === 'active' ? 'active' : 'away'}, updated ${format(new Date(presence.reportedAt), 'h:mm a')}`}>
                        {presence.appId
                          ? <DesktopAppIcon appId={presence.appId} label={formatAppLabel(presence.appId)} className="h-4 w-4 border-0 bg-transparent shadow-none" />
                          : <AppWindow className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{presence.appId ? formatAppLabel(presence.appId) : 'App unavailable'}</span>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${presence.presenceStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span>{presence.presenceStatus === 'active' ? 'Active' : 'Away'}</span>
                        <span className="shrink-0">· Updated {format(new Date(presence.reportedAt), 'h:mm a')}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                        {timer.attendanceMode === 'remote' ? <House className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                        {timer.attendanceMode === 'remote' ? 'Remote' : 'Office'}
                      </span>
                    </div> : <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {timer.attendanceMode === 'remote' ? <House className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {timer.attendanceMode === 'remote' ? 'Remote' : 'Office'}
                    </span>}
                  </div>
                </div>
                <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Clocked in</Badge>
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><ElapsedAttendanceDuration timer={timer} /></span>
                  {status.canManageTeam && <Button variant="outline" size="sm" className="min-h-11 gap-1.5 text-destructive" aria-label={`Clock out ${name}`} onClick={() => setSelectedTimer(timer)}><StopCircle className="h-4 w-4" />Clock out</Button>}
                </div>
          </div>;
        })}
      </div>}
    </section>

    <Dialog open={!!selectedTimer} onOpenChange={(open) => { if (!open && !stopping) { setSelectedTimer(null); setStopReason(''); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clock out {selectedTimer ? memberName(selectedTimer) : 'member'}?</DialogTitle>
          <DialogDescription>This ends the active attendance timer now, including when the member cannot clock out from an approved location. Add an optional reason for the attendance record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="admin-clock-out-reason" className="text-sm font-medium">Reason (optional)</label>
          <textarea
            id="admin-clock-out-reason"
            value={stopReason}
            onChange={(event) => setStopReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Left the approved site before clocking out"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setSelectedTimer(null); setStopReason(''); }} disabled={stopping}>Cancel</Button>
          <Button variant="destructive" onClick={() => void confirmClockOut()} disabled={stopping}>{stopping ? 'Clocking out…' : 'Confirm clock out'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
