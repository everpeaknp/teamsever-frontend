'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/axios';

type PresenceItem = { appId: string; startedAt: string; endedAt: string; user?: { name?: string } };
type GapItem = { gapStartedAt: string; gapEndedAt: string; active?: boolean; user?: { name?: string } };

export function DesktopActivityReport({ workspaceId, userId, startDate, endDate }: { workspaceId: string; userId: string; startDate: string; endDate: string }) {
  const [events, setEvents] = useState<PresenceItem[]>([]);
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [message, setMessage] = useState('Loading desktop app presence…');

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ userId, startDate, endDate });
    const refresh = () => api.get(`/attendance/workspace/${workspaceId}/desktop-activity?${query.toString()}`).then((response) => {
        if (cancelled) return;
        setEvents(response.data.data.events || []);
        setGaps(response.data.data.gaps || []);
        setMessage('');
      }).catch((error) => {
        if (cancelled) return;
        setEvents([]); setGaps([]);
        setMessage(error?.response?.data?.message || 'Desktop app presence is not available for this view.');
      });
    void refresh();
    const timer = setInterval(() => void refresh(), 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [workspaceId, userId, startDate, endDate]);

  return <Card>
    <CardHeader><CardTitle className="text-lg">Desktop app presence</CardTitle><p className="text-sm text-muted-foreground">Foreground app identifiers recorded once per minute while a trusted desktop shift is clocked in and the member has opted in. Window titles and document content are not shown.</p></CardHeader>
    <CardContent>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : events.length === 0 && gaps.length === 0 ? <p className="text-sm text-muted-foreground">No desktop app presence was recorded for this period.</p> : <div className="max-h-96 overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">Member</th><th className="p-2">App</th><th className="p-2">Start</th><th className="p-2">End</th></tr></thead>
          <tbody>
            {events.map((event, index) => <tr key={`event-${event.startedAt}-${index}`} className="border-b last:border-0"><td className="p-2">{event.user?.name || 'You'}</td><td className="p-2 font-mono">{event.appId}</td><td className="p-2">{new Date(event.startedAt).toLocaleString()}</td><td className="p-2">{new Date(event.endedAt).toLocaleTimeString()}</td></tr>)}
            {gaps.map((gap, index) => <tr key={`gap-${gap.gapStartedAt}-${index}`} className="border-b bg-amber-500/5 last:border-0"><td className="p-2">{gap.user?.name || 'You'}</td><td className="p-2 text-amber-600" colSpan={3}>Presence unavailable · {new Date(gap.gapStartedAt).toLocaleTimeString()}–{gap.active ? 'now' : new Date(gap.gapEndedAt).toLocaleTimeString()}. Attendance time was not changed.</td></tr>)}
          </tbody>
        </table>
      </div>}
    </CardContent>
  </Card>;
}
