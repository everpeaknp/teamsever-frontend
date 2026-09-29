'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';

export function LocationReviewPanel({ workspaceId }: { workspaceId: string }) {
  const userId = useAuthStore((state) => state.user?._id || state.userId);
  const [canManage, setCanManage] = useState(false);
  const [ownEvents, setOwnEvents] = useState<any[]>([]);
  const [teamEvents, setTeamEvents] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) return;
      try {
        const own = await api.get(`/attendance/workspace/${workspaceId}/location-checks`, { params: { memberId: userId, history: 'true' } });
        if (cancelled) return;
        setOwnEvents(own.data.data.events.slice(0, 10));
        setCanManage(!!own.data.data.canSeeTeam);
        if (own.data.data.canSeeTeam) {
          const team = await api.get(`/attendance/workspace/${workspaceId}/location-checks`);
          if (!cancelled) setTeamEvents(team.data.data.events);
        }
      } catch (err: any) { if (!cancelled) setError(err.response?.data?.message || 'Could not load location review status.'); }
    };
    void load();
    const timer = setInterval(() => { void load(); }, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [workspaceId, userId]);

  const label = (event: any) => event.status === 'inside' ? 'Inside allowed area' : event.status === 'outside' ? 'Outside assigned area' : 'Location unavailable';
  return <section className="rounded-xl border bg-card p-5 space-y-4">
    <div><h2 className="text-lg font-semibold">Location status & review</h2><p className="text-sm text-muted-foreground">Unavailable or outside checks are review flags only. They do not clock anyone out or change recorded time.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="space-y-2">{ownEvents.length ? ownEvents.map((event) => <div key={event._id} className="flex flex-wrap justify-between gap-2 rounded-lg border p-3 text-sm"><span>{label(event)}{event.activeReviewFlag && <strong className="ml-2 text-amber-600">Needs review</strong>}</span><time className="text-muted-foreground">{new Date(event.receivedAt).toLocaleString()}</time></div>) : <p className="text-sm text-muted-foreground">No location checks have been recorded for your current shifts.</p>}</div>
    {canManage && <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Active team flags</h3>{teamEvents.length ? teamEvents.map((event) => <div key={event._id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-amber-500/30 p-3 text-sm"><span><strong>{event.user?.name || event.user?.email || 'Member'}</strong> · {label(event)}{event.reason && <span className="text-muted-foreground"> — {event.reason}</span>}</span><time className="text-muted-foreground">{new Date(event.receivedAt).toLocaleString()}</time></div>) : <p className="text-sm text-muted-foreground">No active team flags.</p>}</div>}
  </section>;
}
