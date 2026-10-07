'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Activity, Clock, RefreshCw, StopCircle, Building2, House } from 'lucide-react';
import { api } from '@/lib/axios';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export function LiveAttendanceTimers({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [selectedTimer, setSelectedTimer] = useState<ActiveTimer | null>(null);
  const [stopping, setStopping] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
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
    } finally {
      setRefreshing(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(true), 30_000);
    const ticker = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => { window.clearInterval(poll); window.clearInterval(ticker); };
  }, [refresh]);

  const confirmClockOut = async () => {
    if (!selectedTimer) return;
    setStopping(true);
    try {
      await api.post(`/time/admin/stop/${selectedTimer._id}`, { reason: 'Admin clock-out from Attendance' });
      setSelectedTimer(null);
      await refresh(true);
    } catch (cause: any) {
      setError(cause.response?.data?.message || 'Could not clock out this member. Refresh and try again.');
    } finally {
      setStopping(false);
    }
  };

  const timers = status?.activeTimers ?? [];
  const duration = (timer: ActiveTimer) => {
    const seconds = Math.max(timer.currentDuration || 0, Math.floor((now - new Date(timer.startTime).getTime()) / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };
  const memberName = (timer: ActiveTimer) => timer.user?.name?.trim() || 'Workspace member';

  return <>
    <section aria-label="Current attendance" className="border-b px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="h-4 w-4 shrink-0 text-emerald-500" />
          <h3 className="font-semibold">{status?.scope === 'self' ? 'Your current shift' : 'Currently clocked in'}</h3>
          {status && <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            {timers.length} {timers.length === 1 ? 'person' : 'people'}
          </Badge>}
          <span className="hidden text-sm text-muted-foreground sm:inline">Live · refreshes every 30 seconds</span>
        </div>
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh current clock-ins">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
          return <div key={timer._id} className="flex flex-wrap items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    {(timer.user?.avatar || timer.user?.profilePicture) && <AvatarImage src={timer.user.avatar || timer.user.profilePicture} alt="" />}
                    <AvatarFallback>{name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    {timer.user?.email && <p className="truncate text-xs text-muted-foreground">{timer.user.email}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">Started {format(startedAt, 'MMM d, h:mm a')} · {formatDistanceToNowStrict(startedAt, { addSuffix: true })}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {timer.attendanceMode === 'remote' ? <House className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                      {timer.attendanceMode === 'remote' ? 'Remote' : 'Office'}
                    </span>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Clocked in</Badge>
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm tabular-nums"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{duration(timer)}</span>
                  {status.canManageTeam && <Button variant="outline" size="sm" className="gap-1.5 text-destructive" aria-label={`Clock out ${name}`} onClick={() => setSelectedTimer(timer)}><StopCircle className="h-4 w-4" />Clock out</Button>}
                </div>
          </div>;
        })}
      </div>}
    </section>

    <Dialog open={!!selectedTimer} onOpenChange={(open) => { if (!open && !stopping) setSelectedTimer(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clock out {selectedTimer ? memberName(selectedTimer) : 'member'}?</DialogTitle>
          <DialogDescription>This ends the active attendance timer now and records the clock-out time. The action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectedTimer(null)} disabled={stopping}>Cancel</Button>
          <Button variant="destructive" onClick={() => void confirmClockOut()} disabled={stopping}>{stopping ? 'Clocking out…' : 'Confirm clock out'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
