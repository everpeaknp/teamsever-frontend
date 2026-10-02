'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppWindow, CircleHelp } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { ensureTrustedDesktopDevice, setDesktopActivityConsent } from '@/lib/desktopAttendance';
import { formatAppDuration, formatAppLabel, formatAppTimer, summarizeDesktopAppUsage } from './desktopAppUsage';

type PresenceEvent = {
  _id?: string; appId?: string | null; presenceStatus?: 'active' | 'afk' | 'unavailable';
  foregroundAppSupported?: boolean; idleDetectionSupported?: boolean; startedAt: string; endedAt: string;
  timeEntry?: string; user?: { name?: string } | string;
};
type PresenceGap = { _id?: string; gapStartedAt: string; gapEndedAt: string; reason?: string; active?: boolean; user?: { name?: string } | string };
type DesktopStatus = { clockedIn: boolean; clockedInOnThisDevice: boolean; presenceTrackingActive: boolean; workspaceId: string | null; activityMonitoringEnabled: boolean };
type CurrentAppSession = { appId: string | null; presenceStatus: 'active' | 'afk' | 'unavailable'; startedAt: string };

const day = (date: Date) => date.toISOString().slice(0, 10);
const statusLabel = (status?: PresenceEvent['presenceStatus']) => status === 'active' ? 'Active' : status === 'afk' ? 'AFK' : 'Unavailable';
const appTile: Record<string, { text: string; className: string }> = {
  code: { text: 'VS', className: 'bg-blue-600 text-white' }, 'code-insiders': { text: 'VS', className: 'bg-emerald-600 text-white' },
  chrome: { text: 'C', className: 'bg-red-500 text-white' }, brave: { text: 'B', className: 'bg-orange-600 text-white' },
  firefox: { text: 'F', className: 'bg-orange-500 text-white' }, msedge: { text: 'E', className: 'bg-cyan-600 text-white' },
  kiro: { text: 'K', className: 'bg-violet-600 text-white' }, antigravity: { text: 'A', className: 'bg-fuchsia-700 text-white' },
  idea: { text: 'IJ', className: 'bg-rose-700 text-white' }, teams: { text: 'T', className: 'bg-indigo-600 text-white' }, slack: { text: 'S', className: 'bg-purple-700 text-white' },
};

function AppIcon({ appId, label }: { appId: string; label: string }) {
  const key = appId.toLowerCase().replace(/\.exe$/i, '').replace(/\s+/g, '-');
  const tile = appTile[key];
  return <span role="img" aria-label={`${label} app icon`} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-xs font-bold shadow-sm ${tile?.className || 'bg-muted text-muted-foreground'}`}>
    {tile ? tile.text : <AppWindow aria-hidden="true" className="h-4 w-4" />}
  </span>;
}

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
  const [desktopStatus, setDesktopStatus] = useState<DesktopStatus | null>(null);
  const [currentAppSession, setCurrentAppSession] = useState<CurrentAppSession | null>(null);
  const [desktopCapabilities, setDesktopCapabilities] = useState<Awaited<ReturnType<NonNullable<Window['teamseverDesktop']>['getCapabilities']>> | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const isDesktop = typeof window !== 'undefined' && !!window.teamseverDesktop;

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
      setEvents([]); setGaps([]);
      setError(cause?.response?.data?.message || 'Could not load the desktop presence report.');
    } finally { setLoading(false); }
  }, [workspaceId, startDate, endDate, teamView, teamMemberId, canViewTeam]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const desktop = window.teamseverDesktop;
    if (!desktop) return;
    let cancelled = false;
    Promise.all([desktop.getStatus(), desktop.getCapabilities()]).then(([status, capabilities]) => {
      if (!cancelled) { setDesktopStatus(status); setDesktopCapabilities(capabilities); }
    }).catch(() => { if (!cancelled) setDesktopStatus(null); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const desktop = window.teamseverDesktop;
    if (!desktop) return;
    let cancelled = false;
    const refreshCurrentPresence = async () => {
      try { const current = await desktop.getCurrentPresence(); if (!cancelled) setCurrentAppSession(current); }
      catch { if (!cancelled) setCurrentAppSession(null); }
    };
    void refreshCurrentPresence();
    const poll = setInterval(() => void refreshCurrentPresence(), 15_000);
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!canViewTeam) { setMembers([]); return; }
    let cancelled = false;
    api.get(`/workspaces/${workspaceId}/members`).then(({ data }) => {
      if (cancelled) return;
      setMembers((data.data || []).map((member: any) => ({ id: String(member._id || member.id), name: member.name || member.user?.name || 'Member' })).filter((member: { id: string }) => member.id));
    }).catch(() => { if (!cancelled) setMembers([]); });
    return () => { cancelled = true; };
  }, [workspaceId, canViewTeam]);

  const appUsage = useMemo(() => summarizeDesktopAppUsage(events, gaps), [events, gaps]);
  const rows = [
    ...events.map((event, index) => ({ kind: 'event' as const, at: event.startedAt, key: `${event.timeEntry || ''}-${event.startedAt}-${index}`, event })),
    ...gaps.map((gap, index) => ({ kind: 'gap' as const, at: gap.gapStartedAt, key: `gap-${gap._id || gap.gapStartedAt}-${index}`, gap })),
  ].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));

  const attachLaptopPresence = async () => {
    const desktop = window.teamseverDesktop;
    if (!desktop) return;
    setAttaching(true); setAttachError('');
    try {
      const device = await ensureTrustedDesktopDevice();
      if (!device) throw new Error('Could not connect this trusted desktop.');
      await setDesktopActivityConsent(device.deviceId, true);
      await desktop.attachPresenceToActiveShift();
      const status = await desktop.getStatus();
      setDesktopStatus(status);
      await refresh();
    } catch (cause: any) {
      setAttachError(cause?.response?.data?.message || cause?.message || 'Could not start laptop presence tracking.');
      try { setDesktopStatus(await desktop.getStatus()); } catch { /* keep last known state */ }
    } finally { setAttaching(false); }
  };

  return <section className="space-y-4 rounded-xl border bg-card p-5" aria-label="Desktop presence timeline">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Presence & activity</h2><p className="text-sm text-muted-foreground">Desktop reports are shown only during an explicitly consented shift. Missing heartbeats are tracking gaps, never AFK.</p></div>{canViewTeam && <Button type="button" variant={teamView ? 'default' : 'outline'} onClick={() => setTeamView((value) => !value)}>{teamView ? 'Show my timeline' : 'Show team timeline'}</Button>}</div>
    {isDesktop && desktopStatus?.clockedIn && !desktopStatus.presenceTrackingActive && <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      <p className="font-medium">This shift started on another device</p>
      <p className="text-sm text-muted-foreground">You can separately share this laptop’s foreground app name and active/AFK state for the current shift. Attendance clock-in/out and location remain attributed to the device that recorded them. No keys, text, window titles, or screenshots are collected.</p>
      {desktopCapabilities?.foregroundMonitoringSupported === false && <p className="text-sm text-amber-600">App detection unavailable on this system{desktopCapabilities.foregroundUnavailableReason ? `: ${desktopCapabilities.foregroundUnavailableReason}` : ''}. Idle detection may still be reported.</p>}
      {attachError && <p role="alert" className="text-sm text-destructive">{attachError}</p>}
      <Button type="button" disabled={attaching || desktopStatus.workspaceId !== workspaceId} onClick={() => void attachLaptopPresence()}>{attaching ? 'Starting laptop tracking…' : 'Consent and track from this laptop'}</Button>
      {desktopStatus.workspaceId !== workspaceId && <p className="text-xs text-muted-foreground">Open the attendance page for the workspace where this shift is active.</p>}
    </div>}
    {isDesktop && desktopStatus?.presenceTrackingActive && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
      <span className="font-medium">This laptop is reporting app and active/AFK presence</span>
      {desktopCapabilities?.foregroundMonitoringSupported === false && <span className="text-sm text-amber-600">App detection unavailable{desktopCapabilities.foregroundUnavailableReason ? `: ${desktopCapabilities.foregroundUnavailableReason}` : ''}</span>}
    </div>}
    {isDesktop && desktopStatus?.presenceTrackingActive && currentAppSession && <div className="flex items-center gap-3 rounded-lg border p-4" aria-live="polite">
      {currentAppSession.appId ? <AppIcon appId={currentAppSession.appId} label={formatAppLabel(currentAppSession.appId)} /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><AppWindow aria-hidden="true" className="h-4 w-4" /></span>}
      <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wider text-muted-foreground">Current foreground app · {statusLabel(currentAppSession.presenceStatus)}</p><p className="truncate font-medium">{currentAppSession.appId ? formatAppLabel(currentAppSession.appId) : 'App name unavailable'}</p></div>
      <span className="font-mono text-lg font-semibold">{formatAppTimer(Math.max(0, nowMs - Date.parse(currentAppSession.startedAt)))}</span>
    </div>}
    {!isDesktop && <p className="rounded-lg border p-3 text-sm text-muted-foreground">App detection is available only from the paired TeamsEver desktop app. A phone or browser clock-in does not report laptop activity automatically; open this workspace in TeamsEver Desktop and explicitly consent to attach the laptop to the active shift.</p>}
    <div className="flex flex-wrap items-end gap-3"><div className="space-y-1"><label htmlFor="presence-start-date" className="text-sm">From</label><input id="presence-start-date" type="date" className="h-10 rounded-md border bg-background px-3" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div><div className="space-y-1"><label htmlFor="presence-end-date" className="text-sm">To</label><input id="presence-end-date" type="date" className="h-10 rounded-md border bg-background px-3" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>{teamView && canViewTeam && <div className="space-y-1"><label htmlFor="presence-member-filter" className="text-sm">Member</label><select id="presence-member-filter" className="h-10 rounded-md border bg-background px-3" value={teamMemberId} onChange={(event) => setTeamMemberId(event.target.value)}><option value="all">Entire team</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>}<Button type="button" variant="outline" disabled={loading} onClick={() => void refresh()}>Refresh</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {appUsage.length > 0 && <div className="space-y-3 rounded-lg border p-4"><div><h3 className="font-semibold">App usage</h3><p className="text-xs text-muted-foreground">Time is summed from received desktop intervals; gaps are excluded. Sessions count each return to an app after switching apps or a tracking gap.</p></div><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{appUsage.map((app) => <li key={app.appId} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"><AppIcon appId={app.appId} label={app.label} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{app.label}</p><p className="text-xs text-muted-foreground">{app.sessions} {app.sessions === 1 ? 'session' : 'sessions'}</p></div><span className="shrink-0 text-sm font-semibold">{formatAppDuration(app.durationMs)}</span></li>)}</ul></div>}
    {loading ? <p className="text-sm text-muted-foreground">Loading timeline…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No desktop presence intervals or tracking gaps for this period.</p> : <ol className="space-y-2">{rows.map((row) => row.kind === 'gap' ? <li key={row.key} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="font-medium text-amber-700 dark:text-amber-300">Tracking gap{row.gap.active ? ' · ongoing' : ''}</p><p className="text-sm text-muted-foreground">{new Date(row.gap.gapStartedAt).toLocaleString()} – {new Date(row.gap.gapEndedAt).toLocaleString()}. Desktop heartbeat missing; activity during this interval is unknown.</p></li> : <li key={row.key} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"><div className="flex items-start gap-3">{row.event.appId && <AppIcon appId={row.event.appId} label={formatAppLabel(row.event.appId)} />}<div><p className="font-medium">{statusLabel(row.event.presenceStatus)}{row.event.appId ? ` · ${row.event.appId}` : ''}</p><p className="text-sm text-muted-foreground">{new Date(row.event.startedAt).toLocaleString()} – {new Date(row.event.endedAt).toLocaleString()}</p>{(row.event.foregroundAppSupported === false || row.event.idleDetectionSupported === false || !row.event.presenceStatus) && <p className="text-xs text-muted-foreground">{!row.event.presenceStatus ? 'Legacy sample; no activity status was recorded.' : `App detection ${row.event.foregroundAppSupported ? 'available' : 'unavailable'} · idle detection ${row.event.idleDetectionSupported ? 'available' : 'unavailable'}`}</p>}</div></div>{typeof row.event.user === 'object' && row.event.user?.name && <span className="text-sm text-muted-foreground">{row.event.user.name}</span>}</li>)}</ol>}
    <p className="flex items-center gap-1 text-xs text-muted-foreground"><CircleHelp aria-hidden="true" className="h-3.5 w-3.5" /> App names and durations come from local process-name sampling; no window titles, URLs, screenshots, keys, or input details are sent.</p>
  </section>;
}
