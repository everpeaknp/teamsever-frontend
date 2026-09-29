'use client';

import { useEffect, useState } from 'react';
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
  const colors = state === 'inside' ? 'border-emerald-500/30 bg-emerald-500/5' : state === 'checking' ? 'border-blue-500/30 bg-blue-500/5' : 'border-amber-500/40 bg-amber-500/5';
  return <div role="status" className={`mb-4 rounded-lg border p-3 text-sm ${colors}`}><strong>{state === 'inside' ? 'Location checked' : state === 'checking' ? 'Checking location…' : state === 'outside' ? 'Location outside assigned area' : 'Location unavailable'}</strong><p className="mt-1 text-muted-foreground">{message}</p></div>;
}
