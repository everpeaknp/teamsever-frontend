'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Info, LogIn, LogOut } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { readAccurateLocation } from './readAccurateLocation';
import { ensureTrustedDesktopDevice, setDesktopActivityConsent } from '@/lib/desktopAttendance';

interface ClockInOutProps {
  workspaceId: string;
  currentStatus: 'active' | 'inactive';
  runningTimer: any;
  timeTrackingSummary?: {
    todayTracked?: string;
    weekTracked?: string;
    weekProgressPercent?: number;
    lastCheckIn?: string | null;
    lastCheckOut?: string | null;
  } | null;
  onStatusChange: (force?: boolean) => void | Promise<void>;
}

export function ClockInOut({ workspaceId, currentStatus, runningTimer, timeTrackingSummary, onStatusChange }: ClockInOutProps) {
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
  const [locationPolicyEnabled, setLocationPolicyEnabled] = useState(false);
  const [showMobileShiftDetails, setShowMobileShiftDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/attendance/workspace/${workspaceId}/location-policy`).then((response) => {
      if (!cancelled) {
        setLocationPolicyEnabled(!!response.data.data.policy.enabled);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

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

  useEffect(() => {
    if (!workspaceId || !currentUserId) {
      setTodayTracked('0h 0m');
      setWeekTracked('0h 0m');
      setWeekProgressPercent(0);
      setLastCheckIn('—');
      setLastCheckOut('—');
      return;
    }

    setTodayTracked(timeTrackingSummary?.todayTracked || '0h 0m');
    setWeekTracked(timeTrackingSummary?.weekTracked || '0h 0m');
    setWeekProgressPercent(Number(timeTrackingSummary?.weekProgressPercent || 0));
    setLastCheckIn(
      timeTrackingSummary?.lastCheckIn
        ? new Date(timeTrackingSummary.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—'
    );
    setLastCheckOut(
      timeTrackingSummary?.lastCheckOut
        ? new Date(timeTrackingSummary.lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—'
    );
  }, [workspaceId, currentUserId, timeTrackingSummary]);

  const handleClockToggle = async () => {
    if (loading) return;

    if (!workspaceId) {
      toast.error("Workspace ID is missing");
      return;
    }

    try {
      setLoading(true);
      const newStatus = optimisticStatus === 'active' ? 'inactive' : 'active';

      let locationFix: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string } | undefined;
      let maxAccuracyMeters = 100;
      let enforceLocation = locationPolicyEnabled;
      if (newStatus === 'active') {
        const policyResponse = await api.get(`/attendance/workspace/${workspaceId}/location-policy`);
        enforceLocation = !!policyResponse.data.data.policy.enabled;
        maxAccuracyMeters = Number(policyResponse.data.data.policy.maxAccuracyMeters) || 100;
        setLocationPolicyEnabled(enforceLocation);
      }
      if (enforceLocation) {
        if ((!window.isSecureContext || !navigator.geolocation) && newStatus === 'active') throw new Error('Location-based clock-in requires HTTPS and browser location permission.');
        try {
          if (!window.isSecureContext || !navigator.geolocation) throw new Error('Geolocation unavailable');
          locationFix = await readAccurateLocation(maxAccuracyMeters, navigator.geolocation, newStatus === 'active' ? 20_000 : 5_000);
        } catch (locationError) {
          if (locationError instanceof Error && locationError.name === 'StaleLocationError' && newStatus === 'active') throw locationError;
          if (newStatus === 'inactive') {
            throw new Error('Clock-out is blocked because your location could not be verified. Allow location access and retry, or ask a workspace admin to stop your shift as an exception.');
          }
          throw new Error('Location is unavailable or permission was denied. Allow location access and try again.');
        }
      }
      
      console.log('[ClockInOut] Toggling clock:', { 
        from: currentStatus, 
        to: newStatus,
        workspaceId 
      });

      const response = window.teamseverDesktop
        ? await (async () => {
            if (newStatus === 'active') {
              const device = await ensureTrustedDesktopDevice();
              if (!device) throw new Error('Could not connect this trusted desktop. Please retry.');
              const desktopStatus = await window.teamseverDesktop!.getStatus();
              const consentGiven = desktopStatus.activityMonitoringEnabled || window.confirm(
                'Allow TeamsEver Desktop to report the foreground app name and active/AFK state while you are clocked in on this device? It will not capture keystrokes, text, mouse details, window titles, URLs, or screenshots. You can clock in even if you decline.'
              );
              await setDesktopActivityConsent(device.deviceId, consentGiven);
            }
            return window.teamseverDesktop!.toggleClock({ workspaceId, status: newStatus, ...(locationFix ? { locationFix } : {}) });
          })()
        : await api.post(`/workspaces/${workspaceId}/clock/toggle`, {
            status: newStatus,
            ...(locationFix ? { locationFix } : {})
          });
      
      console.log('[ClockInOut] Toggle response:', response.data);

      if (response.data.success) {
        setOptimisticStatus(newStatus);
        setAwaitingServerStatus(true);
        setExpectedServerStatus(newStatus);
        setLocalClockStartTime(newStatus === 'active' ? response.data.data?.timeEntry?.startTime || new Date().toISOString() : null);
        const message = newStatus === 'active' ? 'Clocked in successfully!' : 'Clocked out successfully!';
        console.log('[ClockInOut] Success:', message);
        if (response.data.data?.timeEntry?.locationReviewReason) toast.warning(`Clocked out. Review needed: ${response.data.data.timeEntry.locationReviewReason}`);
        else toast.success(message);
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
      const responseData = error?.response?.data;
      const serverMessage = typeof responseData?.message === 'string'
        ? responseData.message
        : typeof responseData?.error === 'string' ? responseData.error : null;
      const message = serverMessage || error.message || 'Failed to update status';
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        console.warn('[ClockInOut] Clock request rejected:', { status: error.response.status, message, code: error.code });
      } else {
        console.error('[ClockInOut] Failed to toggle clock status:', { message, status: error?.response?.status, code: error?.code });
      }
      toast.error(message);
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

  const renderClockButton = (className: string) => (
    <Button
      type="button"
      onClick={handleClockToggle}
      disabled={loading}
      className={`${className} gap-2 h-11 ${
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
  );

  return (
    <Card className="h-full border-border/80 bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
        <h4 className="font-bold">Time Tracking</h4>
        <button
          type="button"
          aria-label="Shift details"
          aria-expanded={showMobileShiftDetails}
          onClick={() => setShowMobileShiftDetails((open) => !open)}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden"
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </div>
      <CardContent data-testid="mobile-clock-summary" className="flex flex-col gap-2.5 p-3 sm:hidden">
        <div
          className={`rounded-xl border px-3 py-3 ${
            clockedIn
              ? 'border-emerald-400/20 bg-muted/15 shadow-[0_0_18px_rgba(16,185,129,0.10)]'
              : 'border-white/10 bg-muted/15 shadow-[0_0_14px_rgba(59,130,246,0.06)]'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${clockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
              <p className="text-xs font-semibold text-muted-foreground">{clockedIn ? 'Clocked in' : 'Clocked out'}</p>
            </div>
            {clockedIn && <p className="text-lg font-bold tabular-nums">{heroTimer}</p>}
          </div>
          {renderClockButton('mt-2 w-full')}
        </div>

        <div className="grid grid-cols-2 divide-x divide-border/70 rounded-xl border border-border/60 bg-muted/10">
          <div className="min-w-0 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums">{todayTracked}</p>
          </div>
          <div className="min-w-0 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-1">
              <p className="text-xs text-muted-foreground">This week</p>
              <p className="truncate text-xs font-semibold tabular-nums">{weekTracked} / 40h</p>
            </div>
            <div className="mt-2 h-1 w-full rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${clockedIn ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${weekProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {showMobileShiftDetails && (
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground" aria-label="Shift details">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide">Last check-in</p>
                <p className="mt-1 font-medium text-foreground">{lastCheckIn}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide">Last check-out</p>
                <p className="mt-1 font-medium text-foreground">{lastCheckOut}</p>
              </div>
            </div>
            {locationPolicyEnabled && (
              <p className="mt-3 leading-relaxed">Location is checked when you clock in. Keep the Attendance page open during your shift so ongoing checks can be recorded. If checks stop, your shift stays active and may be flagged for review.</p>
            )}
          </div>
        )}
      </CardContent>

      <CardContent className="hidden h-[calc(100%-57px)] flex-col gap-3 p-6 sm:flex">
        <div
          className={`rounded-2xl border px-4 py-4 ${
            clockedIn
              ? 'border-emerald-400/20 bg-muted/15 shadow-[0_0_18px_rgba(16,185,129,0.10)]'
              : 'border-white/10 bg-muted/15 shadow-[0_0_14px_rgba(59,130,246,0.06)]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${clockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{clockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}</p>
              </div>
              <p className="text-sm text-muted-foreground">{clockedIn ? 'Your shift is in progress' : 'Ready when you are'}</p>
            </div>
            <Clock className="h-5 w-5 text-muted-foreground/80" />
          </div>
          <p className="mt-3 text-2xl font-bold tabular-nums">{heroTimer}</p>
          {renderClockButton('mt-3 w-full')}
          {locationPolicyEnabled && !clockedIn && (
            <p className="mt-2 text-xs text-muted-foreground">This workspace checks your browser location at clock-in. While clocked in, checks continue only while the Attendance page stays open; if they stop, your shift remains unchanged and may be flagged for review.</p>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Today Tracked</p>
            <p className="text-2xl font-semibold leading-none mt-1">{todayTracked}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className={`h-full rounded-full transition-all ${clockedIn ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${weekProgressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{weekProgressPercent}% of weekly target completed</p>
        </div>
      </CardContent>
    </Card>
  );
}
