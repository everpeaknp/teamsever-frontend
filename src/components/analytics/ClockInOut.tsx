'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';

interface ClockInOutProps {
  workspaceId: string;
  currentStatus: 'active' | 'inactive';
  runningTimer: any;
  onStatusChange: (force?: boolean) => void | Promise<void>;
}

export function ClockInOut({ workspaceId, currentStatus, runningTimer, onStatusChange }: ClockInOutProps) {
  const { user } = useAuthStore();
  const currentUserId = user?._id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);
  const [loading, setLoading] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<'active' | 'inactive'>(currentStatus);
  const [todayTracked, setTodayTracked] = useState('0h 0m');
  const [weekTracked, setWeekTracked] = useState('0h 0m');
  const [weekProgressPercent, setWeekProgressPercent] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState('—');
  const [lastCheckOut, setLastCheckOut] = useState('—');
  const [nowMs, setNowMs] = useState(Date.now());
  const [localClockStartTime, setLocalClockStartTime] = useState<string | null>(null);
  const [awaitingServerStatus, setAwaitingServerStatus] = useState(false);
  const [expectedServerStatus, setExpectedServerStatus] = useState<'active' | 'inactive' | null>(null);

  useEffect(() => {
    if (awaitingServerStatus && expectedServerStatus) {
      if (currentStatus === expectedServerStatus) {
        setAwaitingServerStatus(false);
        setExpectedServerStatus(null);
      } else {
        return;
      }
    }

    if (!loading) {
      setOptimisticStatus(currentStatus);
      if (currentStatus === 'inactive') {
        setLocalClockStartTime(null);
      }
    }
  }, [currentStatus, loading, awaitingServerStatus, expectedServerStatus]);

  useEffect(() => {
    if (optimisticStatus !== 'active' || !runningTimer?.startTime) return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [optimisticStatus, runningTimer?.startTime]);

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - diffToMonday);
    return {
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    };
  }, []);

  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      try {
        if (!workspaceId || !currentUserId) {
          setTodayTracked('0h 0m');
          setWeekTracked('0h 0m');
          setWeekProgressPercent(0);
          setLastCheckIn('—');
          setLastCheckOut('—');
          return;
        }
        const todayResponse = await api.get(
          `/attendance/workspace/${workspaceId}/report?startDate=${todayDate}&endDate=${todayDate}&userId=${currentUserId}`
        );
        const rawEntries = Array.isArray(todayResponse.data?.data) ? todayResponse.data.data : [];
        const entries = rawEntries.filter((entry: any) => {
          const entryUserId =
            (typeof entry?.user === 'object' ? entry?.user?._id : entry?.user) ||
            entry?.userId ||
            entry?._id;
          return String(entryUserId || '') === String(currentUserId);
        });

        let totalSeconds = 0;
        let latestIn: string | null = null;
        let latestOut: string | null = null;

        for (const entry of entries) {
          const hours = Number(entry?.totalHours || 0);
          if (!Number.isNaN(hours)) totalSeconds += Math.round(hours * 3600);

          if (entry?.clockIn) {
            if (!latestIn || new Date(entry.clockIn) > new Date(latestIn)) latestIn = entry.clockIn;
          }
          if (entry?.clockOut && entry.clockOut !== 'Running') {
            if (!latestOut || new Date(entry.clockOut) > new Date(latestOut)) latestOut = entry.clockOut;
          }
        }

        const totalMinutes = Math.floor(totalSeconds / 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        setTodayTracked(`${h}h ${m}m`);
        setLastCheckIn(latestIn ? new Date(latestIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
        setLastCheckOut(latestOut ? new Date(latestOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');

        const weekResponse = await api.get(
          `/attendance/workspace/${workspaceId}/report?startDate=${weekRange.start}&endDate=${weekRange.end}&userId=${currentUserId}`
        );
        const rawWeekEntries = Array.isArray(weekResponse.data?.data) ? weekResponse.data.data : [];
        const weekEntries = rawWeekEntries.filter((entry: any) => {
          const entryUserId =
            (typeof entry?.user === 'object' ? entry?.user?._id : entry?.user) ||
            entry?.userId ||
            entry?._id;
          return String(entryUserId || '') === String(currentUserId);
        });
        let weekSeconds = 0;
        for (const entry of weekEntries) {
          const hours = Number(entry?.totalHours || 0);
          if (!Number.isNaN(hours)) weekSeconds += Math.round(hours * 3600);
        }
        const weekMinutes = Math.floor(weekSeconds / 60);
        const weekH = Math.floor(weekMinutes / 60);
        const weekM = weekMinutes % 60;
        setWeekTracked(`${weekH}h ${weekM}m`);

        const weeklyTargetHours = 40;
        const weekHoursExact = weekSeconds / 3600;
        const progress = Math.max(0, Math.min(100, Math.round((weekHoursExact / weeklyTargetHours) * 100)));
        setWeekProgressPercent(progress);
      } catch {
        setTodayTracked('0h 0m');
        setWeekTracked('0h 0m');
        setWeekProgressPercent(0);
        setLastCheckIn('—');
        setLastCheckOut('—');
      }
    };

    fetchAttendanceSummary();
  }, [workspaceId, currentUserId, todayDate, weekRange.start, weekRange.end, currentStatus, runningTimer]);

  const handleClockToggle = async () => {
    if (loading) return;

    if (!workspaceId) {
      toast.error("Workspace ID is missing");
      return;
    }

    try {
      setLoading(true);
      const newStatus = optimisticStatus === 'active' ? 'inactive' : 'active';
      setOptimisticStatus(newStatus);
      setAwaitingServerStatus(true);
      setExpectedServerStatus(newStatus);
      if (newStatus === 'active') {
        setLocalClockStartTime(new Date().toISOString());
      } else {
        setLocalClockStartTime(null);
      }
      
      console.log('[ClockInOut] Toggling clock:', { 
        from: currentStatus, 
        to: newStatus,
        workspaceId 
      });

      const response = await api.post(`/workspaces/${workspaceId}/clock/toggle`, {
        status: newStatus
      });
      
      console.log('[ClockInOut] Toggle response:', response.data);

      if (response.data.success) {
        const message = newStatus === 'active' ? 'Clocked in successfully!' : 'Clocked out successfully!';
        console.log('[ClockInOut] Success:', message);
        toast.success(message);
        // Refresh parent data without blocking UI feedback
        Promise.resolve(onStatusChange(true)).catch((refreshErr) => {
          console.error('[ClockInOut] Failed to refresh status after toggle:', refreshErr);
        });
      } else {
        throw new Error('Toggle failed');
      }
    } catch (error: any) {
      setOptimisticStatus(currentStatus);
      setLocalClockStartTime(null);
      setAwaitingServerStatus(false);
      setExpectedServerStatus(null);
      console.error('[ClockInOut] Failed to toggle clock status:', error);
      console.error('[ClockInOut] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const clockedIn = optimisticStatus === 'active';
  const heroTimer = useMemo(() => {
    if (!clockedIn) return '00:00:00';
    const effectiveStartTime = runningTimer?.startTime || localClockStartTime;
    if (!effectiveStartTime) return '00:00:00';
    const startMs = new Date(effectiveStartTime).getTime();
    if (Number.isNaN(startMs)) return '00:00:00';
    const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
    const hh = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }, [clockedIn, runningTimer?.startTime, localClockStartTime, nowMs]);

  return (
    <Card className="h-full border-border/80 bg-card">
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Time Tracking</h4>
      </div>
      <CardContent className="p-6 h-[calc(100%-57px)] flex flex-col gap-3">
        <div
          className={`rounded-[20px] border px-4 py-4 ${
            clockedIn
              ? 'border-emerald-400/20 bg-muted/15 shadow-[0_0_18px_rgba(16,185,129,0.10)]'
              : 'border-white/10 bg-muted/15 shadow-[0_0_14px_rgba(59,130,246,0.06)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    clockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
                  }`}
                />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {clockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Start timer to begin tracking</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground/80" />
          </div>

          <p className="mt-4 text-2xl font-bold tabular-nums">{heroTimer}</p>

          <Button
            type="button"
            onClick={handleClockToggle}
            disabled={loading}
            className={`mt-4 w-full gap-2 h-11 ${
              clockedIn
                ? '!bg-red-600 !text-white hover:!bg-red-700 focus-visible:!ring-red-500/40'
                : '!bg-emerald-600 !text-white hover:!bg-emerald-700 focus-visible:!ring-emerald-500/40'
            }`}
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                {clockedIn ? 'Clocking Out...' : 'Clocking In...'}
              </>
            ) : clockedIn ? (
              <>
                <LogOut className="w-4 h-4" />
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Clock In
              </>
            )}
          </Button>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Today Tracked</p>
            <p className="text-2xl font-semibold leading-none mt-1">{todayTracked}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last Check-in</p>
              <p className="text-sm font-medium mt-1">{lastCheckIn}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last Check-out</p>
              <p className="text-sm font-medium mt-1">{lastCheckOut}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">This Week</p>
            <p className="text-sm font-medium">{weekTracked} / 40h</p>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${clockedIn ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${weekProgressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {weekProgressPercent}% of weekly target completed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
