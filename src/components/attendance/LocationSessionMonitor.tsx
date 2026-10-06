'use client';

import { useEffect, useState } from 'react';
import { Activity, MapPin } from 'lucide-react';
import { api } from '@/lib/axios';

function readLocation(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) return reject(new Error('Location requires a secure browser connection and location access.'));
    navigator.geolocation.getCurrentPosition((position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMeters: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }), () => reject(new Error('Location is unavailable or permission was denied.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

export function LocationSessionMonitor({ workspaceId }: { workspaceId: string }) {
  const [state, setState] = useState<'loading' | 'idle' | 'checking' | 'inside' | 'outside' | 'unavailable'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeEntryId: string | null = null;
    let seconds = 60;
    const check = async () => {
      if (stopped || !timeEntryId) return;
      setState('checking');
      try {
        const policyRes = await api.get(`/attendance/workspace/${workspaceId}/location-policy`);
        const latestId = policyRes.data.data.runningTimeEntry?._id;
        if (!latestId || latestId !== timeEntryId) {
          timeEntryId = null;
          if (interval) clearInterval(interval);
          setState('idle');
          setMessage('Location checks ended because this shift is no longer running.');
          return;
        }
        const locationFix = await readLocation();
        const response = await api.post(`/attendance/workspace/${workspaceId}/location-checks`, { timeEntryId, status: 'location', locationFix });
        if (stopped) return;
        const event = response.data.data.event;
        setState(event.status);
        setMessage(event.status === 'inside' ? 'Location check is up to date.' : event.reason || 'Location needs review. Your recorded time is unchanged.');
      } catch (error: any) {
        if (stopped) return;
        if (timeEntryId) {
          try {
            await api.post(`/attendance/workspace/${workspaceId}/location-checks`, { timeEntryId, status: 'unavailable' });
          } catch { /* The server stale check will flag a missed update. */ }
        }
        setState('unavailable');
        setMessage(error.response?.data?.message || error.message || 'Location is unavailable. Your recorded time is unchanged.');
      }
    };
    const start = async () => {
      try {
        const response = await api.get(`/attendance/workspace/${workspaceId}/location-policy`);
        if (stopped) return;
        const data = response.data.data;
        if (!data.policy.enabled || !data.runningTimeEntry?._id) { setState('idle'); setMessage('No active location-enforced shift.'); return; }
        timeEntryId = data.runningTimeEntry._id;
        seconds = Math.max(30, Number(data.policy.checkIntervalSeconds) || 60);
        setState('checking');
        setMessage('Location checks run while this attendance page stays open. If a check is unavailable, the clock and recorded time are not changed.');
        interval = setInterval(() => { void check(); }, seconds * 1000);
        void check();
      } catch (error: any) {
        if (!stopped) { setState('unavailable'); setMessage(error.response?.data?.message || 'Could not start location checks.'); }
      }
    };
    void start();
    return () => { stopped = true; if (interval) clearInterval(interval); };
  }, [workspaceId]);

  if (state === 'loading' || state === 'idle') return null;
  const label = state === 'inside'
    ? 'Location verified'
    : state === 'checking'
      ? 'Checking location…'
      : state === 'outside'
        ? 'Location outside assigned area'
        : 'Location check needs attention';
  const tone = state === 'inside'
    ? 'text-emerald-600 dark:text-emerald-400'
    : state === 'checking'
      ? 'text-muted-foreground'
      : 'text-amber-700 dark:text-amber-300';
  const icon = state === 'checking' ? Activity : MapPin;
  const Icon = icon;

  return (
    <div className="border-b px-6 py-2.5">
      <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden="true" />
        <span className={`font-medium ${tone}`}>{label}</span>
        {(state === 'outside' || state === 'unavailable') && (
          <details className="text-muted-foreground">
            <summary className="cursor-pointer select-none underline underline-offset-2">Details</summary>
            <p className="mt-1 max-w-xl text-xs">{message} Your recorded time is unchanged.</p>
          </details>
        )}
      </div>
    </div>
  );
}
