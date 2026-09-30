'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';

type PresenceEvent = {
  _id?: string;
  appId?: string | null;
  presenceStatus?: 'active' | 'afk' | 'unavailable';
  foregroundAppSupported?: boolean;
  idleDetectionSupported?: boolean;
  startedAt: string;
  endedAt: string;
  timeEntry?: string;
  user?: { name?: string } | string;
};
type PresenceGap = { _id?: string; gapStartedAt: string; gapEndedAt: string; reason?: string; active?: boolean; user?: { name?: string } | string };

const day = (date: Date) => date.toISOString().slice(0, 10);
const statusLabel = (status?: PresenceEvent['presenceStatus']) => status === 'active' ? 'Active' : status === 'afk' ? 'AFK' : 'Unavailable';

export function DesktopPresenceTimeline({ workspaceId, canViewTeam = false }: { workspaceId: string; canViewTeam?: boolean }) {
  const today = day(new Date());
  const [startDate, setStartDate] = useState(() => day(new Date(Date.now() - 6 * 24 * 60 * 60_000)));
  const [endDate, setEndDate] = useState(today);
  const [teamView, setTeamView] = useState(false);
  const [teamMemberId, setTeamMemberId] = useState('all');
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [gaps, setGaps] = useState<PresenceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams({ startDate, endDate });
    if (teamView && canViewTeam) query.set('userId', teamMemberId);
    try {
      const { data } = await api.get(`/attendance/workspace/${workspaceId}/desktop-activity?${query}`);
      setEvents(data.data.events || []);
      setGaps(data.data.gaps || []);
    } catch (cause: any) {
      setEvents([]);
      setGaps([]);
      setError(cause?.response?.data?.message || 'Could not load the desktop presence report.');
    } finally { setLoading(false); }
  }, [workspaceId, startDate, endDate, teamView, teamMemberId, canViewTeam]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!canViewTeam) { setMembers([]); return; }
    let cancelled = false;
    api.get(`/workspaces/${workspaceId}/members`).then(({ data }) => {
      if (cancelled) return;
      setMembers((data.data || []).map((member: any) => ({ id: String(member._id || member.id), name: member.name || member.user?.name || 'Member' })).filter((member: { id: string }) => member.id));
    }).catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [workspaceId, canViewTeam]);

  const rows = [
    ...events.map((event, index) => ({ kind: 'event' as const, at: event.startedAt, key: `${event.timeEntry || ''}-${event.startedAt}-${index}`, event })),
    ...gaps.map((gap, index) => ({ kind: 'gap' as const, at: gap.gapStartedAt, key: `gap-${gap._id || gap.gapStartedAt}-${index}`, gap })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));

  return <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Desktop presence timeline">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Presence & activity</h2><p className="text-sm text-muted-foreground">Desktop reports are shown only during a consented shift clocked in from that trusted device. Missing heartbeats are tracking gaps, never AFK.</p></div>{canViewTeam && <Button type="button" variant={teamView ? 'default' : 'outline'} onClick={() => setTeamView((value) => !value)}>{teamView ? 'Show my timeline' : 'Show team timeline'}</Button>}</div>
    <div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><label htmlFor="presence-start-date" className="text-sm">From</label><input id="presence-start-date" type="date" className="h-10 rounded-md border bg-background px-3" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div><div className="space-y-1"><label htmlFor="presence-end-date" className="text-sm">To</label><input id="presence-end-date" type="date" className="h-10 rounded-md border bg-background px-3" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>{teamView && canViewTeam && <div className="space-y-1"><label htmlFor="presence-member-filter" className="text-sm">Member</label><select id="presence-member-filter" className="h-10 rounded-md border bg-background px-3" value={teamMemberId} onChange={(event) => setTeamMemberId(event.target.value)}><option value="all">Entire team</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>}<Button type="button" variant="outline" disabled={loading} onClick={() => void refresh()}>Refresh</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading timeline…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No desktop presence intervals or tracking gaps for this period.</p> : <ol className="space-y-2">{rows.map((row) => row.kind === 'gap' ? <li key={row.key} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="font-medium text-amber-700 dark:text-amber-300">Tracking gap{row.gap.active ? ' · ongoing' : ''}</p><p className="text-sm text-muted-foreground">{new Date(row.gap.gapStartedAt).toLocaleString()} – {new Date(row.gap.gapEndedAt).toLocaleString()}. Desktop heartbeat missing; activity during this interval is unknown.</p></li> : <li key={row.key} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{statusLabel(row.event.presenceStatus)}{row.event.appId ? ` · ${row.event.appId}` : ''}</p><p className="text-sm text-muted-foreground">{new Date(row.event.startedAt).toLocaleString()} – {new Date(row.event.endedAt).toLocaleString()}</p>{(row.event.foregroundAppSupported === false || row.event.idleDetectionSupported === false || !row.event.presenceStatus) && <p className="text-xs text-muted-foreground">{!row.event.presenceStatus ? 'Legacy sample; no activity status was recorded.' : `App detection ${row.event.foregroundAppSupported ? 'available' : 'unavailable'} · idle detection ${row.event.idleDetectionSupported ? 'available' : 'unavailable'}`}</p>}</div>{typeof row.event.user === 'object' && row.event.user?.name && <span className="text-sm text-muted-foreground">{row.event.user.name}</span>}</li>)}</ol>}
  </section>;
}
