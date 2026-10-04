'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleHelp, RefreshCw, Users } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ensureTrustedDesktopDevice, setDesktopActivityConsent } from '@/lib/desktopAttendance';
import { formatAppDuration, formatAppLabel, formatAppTimer } from './desktopAppUsage';
import { DesktopAppIcon } from './DesktopAppIcon';

type CurrentMember = {
  userId: string;
  displayName: string;
  avatar: string | null;
  presence: null | { appId: string | null; presenceStatus: 'active' | 'afk'; reportedAt: string };
};
type HistoryItem =
  | { kind: 'app'; id: string; appId: string | null; presenceStatus: 'active' | 'afk'; foregroundAppSupported: boolean; idleDetectionSupported: boolean; startedAt: string; endedAt: string }
  | { kind: 'gap'; id: string; reason: string; active: boolean; startedAt: string; endedAt: string };
type PresenceSummary = { apps: Array<{ appId: string; durationMs: number; sessions: number }>; activeMs: number; afkMs: number; gapMs: number };
type DesktopStatus = { clockedIn: boolean; clockedInOnThisDevice: boolean; presenceTrackingActive: boolean; clockInSource?: 'web' | 'desktop' | 'mobile' | null; workspaceId: string | null; activityMonitoringEnabled: boolean };
type CurrentAppSession = { appId: string | null; presenceStatus: 'active' | 'afk' | 'unavailable'; startedAt: string };
type ReporterDiagnostics = { running: boolean; lastError: string | null; lastSuccessfulHeartbeatAt: string | null };

const day = (date: Date) => date.toISOString().slice(0, 10);
const statusLabel = (status: 'active' | 'afk' | 'unavailable') => status === 'active' ? 'Active' : status === 'afk' ? 'AFK' : 'Unavailable';
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
const timeLabel = (date: string) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function DesktopPresenceTimeline({ workspaceId }: { workspaceId: string }) {
  const today = day(new Date());
  const [startDate, setStartDate] = useState(() => day(new Date(Date.now() - 6 * 24 * 60 * 60_000)));
  const [endDate, setEndDate] = useState(today);
  const [members, setMembers] = useState<CurrentMember[]>([]);
  const [rosterCursor, setRosterCursor] = useState<string | null>(null);
  const [hasMoreRoster, setHasMoreRoster] = useState(false);
  const [canViewHistory, setCanViewHistory] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterLoadingMore, setRosterLoadingMore] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CurrentMember | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historySummary, setHistorySummary] = useState<PresenceSummary | null>(null);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [desktopStatus, setDesktopStatus] = useState<DesktopStatus | null>(null);
  const [currentAppSession, setCurrentAppSession] = useState<CurrentAppSession | null>(null);
  const [reporterDiagnostics, setReporterDiagnostics] = useState<ReporterDiagnostics | null>(null);
  const [desktopCapabilities, setDesktopCapabilities] = useState<Awaited<ReturnType<NonNullable<Window['teamseverDesktop']>['getCapabilities']>> | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachError, setAttachError] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());
  const [showAllApps, setShowAllApps] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!window.teamseverDesktop;

  const loadRoster = useCallback(async (cursor?: string | null, append = false, quiet = false) => {
    if (append) setRosterLoadingMore(true);
    else if (!quiet) { setRosterLoading(true); setError(''); }
    try {
      const query = new URLSearchParams({ pageSize: '50' });
      if (cursor) query.set('cursor', cursor);
      const { data } = await api.get(`/attendance/workspace/${workspaceId}/desktop-presence/current?${query}`);
      const payload = data?.data;
      const nextMembers: CurrentMember[] = Array.isArray(payload?.members) ? payload.members : [];
      setMembers((previous) => {
        if (!append) return nextMembers;
        const known = new Set(previous.map((member) => member.userId));
        return [...previous, ...nextMembers.filter((member) => !known.has(member.userId))];
      });
      setCanViewHistory(payload?.permissions?.canViewHistory === true);
      setRosterCursor(payload?.pagination?.nextCursor || null);
      setHasMoreRoster(payload?.pagination?.hasMore === true);
      if (payload?.permissions?.canViewHistory !== true) {
        setSelectedMember(null);
        setHistoryItems([]);
        setHistorySummary(null);
      }
    } catch (cause: any) {
      if (!quiet) {
        setMembers([]);
        setError(cause?.response?.data?.message || 'Could not load current desktop presence.');
      }
    } finally {
      if (append) setRosterLoadingMore(false);
      else if (!quiet) setRosterLoading(false);
    }
  }, [workspaceId]);

  const loadHistory = useCallback(async (member: CurrentMember, cursor?: string | null, append = false) => {
    if (!canViewHistory) return;
    if (append) setHistoryLoadingMore(true);
    else { setHistoryLoading(true); setError(''); setHistoryItems([]); setHistorySummary(null); setShowAllApps(false); }
    try {
      const query = new URLSearchParams({ userId: member.userId, startDate, endDate, pageSize: '50' });
      if (cursor) query.set('cursor', cursor);
      const { data } = await api.get(`/attendance/workspace/${workspaceId}/desktop-activity?${query}`);
      const payload = data?.data;
      const items: HistoryItem[] = Array.isArray(payload?.items) ? payload.items : [];
      setHistoryItems((previous) => {
        if (!append) return items;
        const known = new Set(previous.map((item) => `${item.kind}:${item.id}`));
        return [...previous, ...items.filter((item) => !known.has(`${item.kind}:${item.id}`))];
      });
      if (!append) setHistorySummary(payload?.summary || null);
      setHistoryCursor(payload?.pagination?.nextCursor || null);
      setHasMoreHistory(payload?.pagination?.hasMore === true);
    } catch (cause: any) {
      setError(cause?.response?.status === 403
        ? 'You no longer have permission to view this member’s desktop history.'
        : cause?.response?.data?.message || 'Could not load this member’s desktop history.');
      if (cause?.response?.status === 403) {
        setCanViewHistory(false);
        setSelectedMember(null);
        setHistoryItems([]);
        setHistorySummary(null);
      }
    } finally {
      if (append) setHistoryLoadingMore(false);
      else setHistoryLoading(false);
    }
  }, [workspaceId, startDate, endDate, canViewHistory]);

  useEffect(() => {
    void loadRoster();
    const poll = setInterval(() => void loadRoster(null, false, true), 30_000);
    return () => clearInterval(poll);
  }, [loadRoster]);

  useEffect(() => {
    if (selectedMember) void loadHistory(selectedMember);
  }, [selectedMember, startDate, endDate, loadHistory]);

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
      try {
        const [current, diagnostics] = await Promise.all([
          desktop.getCurrentPresence(),
          desktop.getPresenceDiagnostics?.() ?? Promise.resolve(null),
        ]);
        if (!cancelled) { setCurrentAppSession(current); setReporterDiagnostics(diagnostics); }
      } catch { if (!cancelled) setCurrentAppSession(null); }
    };
    void refreshCurrentPresence();
    const poll = setInterval(() => void refreshCurrentPresence(), 15_000);
    const timer = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => { cancelled = true; clearInterval(poll); clearInterval(timer); };
  }, []);

  const attachLaptopPresence = async () => {
    const desktop = window.teamseverDesktop;
    if (!desktop) return;
    setAttaching(true); setAttachError('');
    try {
      const device = await ensureTrustedDesktopDevice();
      if (!device) throw new Error('Could not connect this trusted desktop.');
      await setDesktopActivityConsent(device.deviceId, true);
      await desktop.attachPresenceToActiveShift();
      setDesktopStatus(await desktop.getStatus());
      await loadRoster(null, false, true);
    } catch (cause: any) {
      setAttachError(cause?.response?.data?.message || cause?.message || 'Could not start laptop presence tracking.');
      try { setDesktopStatus(await desktop.getStatus()); } catch { /* keep the last known state */ }
    } finally { setAttaching(false); }
  };

  const pairMobileShift = async () => {
    const desktop = window.teamseverDesktop;
    if (!desktop) return;
    setAttaching(true); setAttachError('');
    try {
      await desktop.pairMobileCode(pairingCode.trim());
      setPairingCode('');
      setDesktopStatus(await desktop.getStatus());
      await loadRoster(null, false, true);
    } catch (cause: any) {
      setAttachError(cause?.response?.data?.message || cause?.message || 'Could not link this mobile shift.');
    } finally { setAttaching(false); }
  };

  const groupedItems = useMemo(() => {
    const groups = new Map<string, HistoryItem[]>();
    for (const item of historyItems) {
      const key = day(new Date(item.startedAt));
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => right.localeCompare(left));
  }, [historyItems]);
  const apps = historySummary?.apps || [];
  const shownApps = showAllApps ? apps : apps.slice(0, 5);

  const openHistory = (member: CurrentMember) => {
    if (!canViewHistory) return;
    setSelectedMember(member);
    setError('');
  };
  const refresh = () => selectedMember ? void loadHistory(selectedMember) : void loadRoster();

  return <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5" aria-label="Desktop presence timeline">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {selectedMember && <Button type="button" variant="outline" size="icon" aria-label="Back to current presence" onClick={() => { setSelectedMember(null); setError(''); }}><ArrowLeft aria-hidden="true" className="h-4 w-4" /></Button>}
        <div><h2 className="text-lg font-semibold">{selectedMember ? `${selectedMember.displayName} · Desktop activity` : 'Current desktop presence'}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedMember ? 'Detailed app and activity history for this member.' : 'See who is currently sharing desktop presence in this workspace.'}</p></div>
      </div>
      <Button type="button" variant="outline" size="icon" aria-label="Refresh desktop presence" disabled={rosterLoading || historyLoading} onClick={refresh}><RefreshCw aria-hidden="true" className="h-4 w-4" /></Button>
    </div>

    {isDesktop && <div className="space-y-3 rounded-lg border bg-muted/20 p-3 sm:p-4" aria-label="My desktop">
      <div><h3 className="font-semibold">My desktop</h3><p className="text-sm text-muted-foreground">Your laptop reports only during a linked, consented shift.</p></div>
      {desktopStatus?.clockedIn && !desktopStatus.presenceTrackingActive && desktopStatus.clockInSource === 'mobile' && <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <p className="font-medium">Link this mobile shift to this laptop</p><p className="text-sm text-muted-foreground">If automatic same-network sync did not appear, enter the short-lived code generated in the mobile app. The mobile app remains the source of attendance and location.</p>
        {attachError && <p role="alert" className="text-sm text-destructive">{attachError}</p>}
        <div className="flex flex-wrap gap-2"><input aria-label="Mobile pairing code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" className="h-10 w-40 rounded-md border bg-background px-3 font-mono tracking-widest" value={pairingCode} onChange={(event) => setPairingCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" /><Button type="button" disabled={attaching || pairingCode.length !== 6 || desktopStatus.workspaceId !== workspaceId} onClick={() => void pairMobileShift()}>{attaching ? 'Linking…' : 'Link mobile shift'}</Button></div>
      </div>}
      {desktopStatus?.clockedIn && !desktopStatus.presenceTrackingActive && desktopStatus.clockInSource !== 'mobile' && <div className="space-y-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
        <p className="font-medium">This shift started on another device</p><p className="text-sm text-muted-foreground">You can separately share this laptop’s foreground app name and active/AFK state. No keys, text, window titles, or screenshots are collected.</p>
        {desktopCapabilities?.foregroundMonitoringSupported === false && <p className="text-sm text-amber-600">App detection unavailable on this system{desktopCapabilities.foregroundUnavailableReason ? `: ${desktopCapabilities.foregroundUnavailableReason}` : ''}. Idle detection may still be reported.</p>}
        {attachError && <p role="alert" className="text-sm text-destructive">{attachError}</p>}
        <Button type="button" disabled={attaching || desktopStatus.workspaceId !== workspaceId} onClick={() => void attachLaptopPresence()}>{attaching ? 'Starting laptop tracking…' : 'Consent and track from this laptop'}</Button>
      </div>}
      {desktopStatus?.presenceTrackingActive && <div role={reporterDiagnostics?.running && !reporterDiagnostics.lastError && reporterDiagnostics.lastSuccessfulHeartbeatAt ? 'status' : 'alert'} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${reporterDiagnostics?.running && !reporterDiagnostics.lastError && reporterDiagnostics.lastSuccessfulHeartbeatAt ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${reporterDiagnostics?.running && !reporterDiagnostics.lastError && reporterDiagnostics.lastSuccessfulHeartbeatAt ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" /><span className="font-medium">{!reporterDiagnostics ? 'Presence is authorized on this laptop; checking reporter status…' : reporterDiagnostics.lastError ? `Desktop presence report failed: ${reporterDiagnostics.lastError}` : !reporterDiagnostics.running ? 'Presence is authorized, but the desktop tracker is not running.' : reporterDiagnostics.lastSuccessfulHeartbeatAt ? `This laptop is reporting app and active/AFK presence · last report ${new Date(reporterDiagnostics.lastSuccessfulHeartbeatAt).toLocaleTimeString()}` : 'Sampling on this laptop; the first server report is sent after 15 seconds.'}</span>
      </div>}
      {desktopStatus?.presenceTrackingActive && currentAppSession && <div className="flex items-center gap-3 rounded-lg border p-3" aria-live="polite">
        {currentAppSession.appId ? <DesktopAppIcon appId={currentAppSession.appId} label={formatAppLabel(currentAppSession.appId)} /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">□</span>}
        <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wider text-muted-foreground">Current foreground app · {statusLabel(currentAppSession.presenceStatus)}</p><p className="truncate font-medium">{currentAppSession.appId ? formatAppLabel(currentAppSession.appId) : 'App name unavailable'}</p></div><span className="font-mono text-lg font-semibold">{formatAppTimer(Math.max(0, nowMs - Date.parse(currentAppSession.startedAt)))}</span>
      </div>}
    </div>}

    {!isDesktop && !selectedMember && <p className="rounded-lg border p-3 text-sm text-muted-foreground">Your phone shows desktop presence reported by paired laptops; it does not scan laptop apps itself.</p>}

    {selectedMember ? <>
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/20 p-3">
        <div className="space-y-1"><label htmlFor="presence-start-date" className="text-sm">From</label><input id="presence-start-date" type="date" className="h-10 rounded-md border bg-background px-3" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
        <div className="space-y-1"><label htmlFor="presence-end-date" className="text-sm">To</label><input id="presence-end-date" type="date" className="h-10 rounded-md border bg-background px-3" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
      </div>
      {historySummary && <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><p className="text-xs font-medium uppercase text-muted-foreground">Active</p><p className="mt-1 text-lg font-semibold">{formatAppDuration(historySummary.activeMs)}</p></div><div className="rounded-lg border p-3"><p className="text-xs font-medium uppercase text-muted-foreground">AFK</p><p className="mt-1 text-lg font-semibold">{formatAppDuration(historySummary.afkMs)}</p></div><div className="rounded-lg border p-3"><p className="text-xs font-medium uppercase text-muted-foreground">Tracking gaps</p><p className="mt-1 text-lg font-semibold">{formatAppDuration(historySummary.gapMs)}</p></div></div>}
      {shownApps.length > 0 && <div className="space-y-3 rounded-lg border p-4"><div><h3 className="font-semibold">App usage</h3><p className="text-xs text-muted-foreground">Totals cover the selected range. Tracking gaps are unknown time.</p></div><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{shownApps.map((app) => <li key={app.appId} className="flex min-w-0 items-center gap-3 rounded-lg bg-muted/30 p-3"><DesktopAppIcon appId={app.appId} label={formatAppLabel(app.appId)} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{formatAppLabel(app.appId)}</p><p className="text-xs text-muted-foreground">{app.sessions} {app.sessions === 1 ? 'session' : 'sessions'}</p></div><span className="shrink-0 text-sm font-semibold">{formatAppDuration(app.durationMs)}</span></li>)}</ul>{apps.length > 5 && <Button type="button" variant="outline" onClick={() => setShowAllApps((value) => !value)}>{showAllApps ? 'Show fewer apps' : `Show all ${apps.length} apps`}</Button>}</div>}
      {historyLoading ? <p role="status" className="text-sm text-muted-foreground">Loading {selectedMember.displayName}’s activity…</p> : error ? null : historyItems.length === 0 ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">No desktop activity was reported for this member and date range.</p> : <div className="space-y-4">{groupedItems.map(([date, items]) => <section key={date} aria-label={`Activity on ${date}`}><h3 className="mb-2 text-sm font-semibold">{new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</h3><ol className="space-y-2">{items.map((item) => item.kind === 'gap' ? <li key={`gap:${item.id}`} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"><p className="font-medium text-amber-700 dark:text-amber-300">Tracking gap{item.active ? ' · ongoing' : ''}</p><p className="text-sm text-muted-foreground">{timeLabel(item.startedAt)} – {timeLabel(item.endedAt)}. Activity during this interval is unknown.</p></li> : <li key={`app:${item.id}`} className="flex items-center gap-3 rounded-lg border p-3">{item.appId ? <DesktopAppIcon appId={item.appId} label={formatAppLabel(item.appId)} /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">□</span>}<div className="min-w-0 flex-1"><p className="truncate font-medium">{item.appId ? formatAppLabel(item.appId) : 'App name unavailable'}</p><p className="text-sm text-muted-foreground">{timeLabel(item.startedAt)} – {timeLabel(item.endedAt)}</p></div><span className={`text-sm font-medium ${item.presenceStatus === 'afk' ? 'text-amber-600' : 'text-emerald-600'}`}>{statusLabel(item.presenceStatus)}</span></li>)}</ol></section>)}</div>}
      {hasMoreHistory && <div className="flex justify-center"><Button type="button" variant="outline" disabled={historyLoadingMore} onClick={() => void loadHistory(selectedMember, historyCursor, true)}>{historyLoadingMore ? 'Loading…' : 'Load more activity'}</Button></div>}
    </> : <>
      <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Workspace members</h3><p className="text-sm text-muted-foreground">Current desktop status only. Old app reports are never shown as current.</p></div><div className="flex items-center gap-2 text-sm text-muted-foreground"><Users aria-hidden="true" className="h-4 w-4" />{members.length}</div></div>
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {rosterLoading ? <p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading workspace presence…</p> : members.length === 0 ? error ? null : <p className="rounded-lg border p-4 text-sm text-muted-foreground">No workspace members to show.</p> : <ul className="divide-y rounded-lg border">{members.map((member) => <li key={member.userId} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <Avatar className="h-10 w-10"><AvatarImage src={member.avatar || undefined} alt="" /><AvatarFallback>{initials(member.displayName)}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{member.displayName}</p>{member.presence ? <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">{member.presence.appId && <span className="flex min-w-0 items-center gap-2"><DesktopAppIcon appId={member.presence.appId} label={formatAppLabel(member.presence.appId)} className="h-6 w-6" /><span className="truncate">{formatAppLabel(member.presence.appId)}</span></span>}<span className={`inline-flex items-center gap-1.5 ${member.presence.presenceStatus === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}><span className={`h-2 w-2 rounded-full ${member.presence.presenceStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />{statusLabel(member.presence.presenceStatus)}</span><span className="text-xs text-muted-foreground">Updated {timeLabel(member.presence.reportedAt)}</span></div> : <p className="mt-1 text-sm text-muted-foreground">Not reporting</p>}</div>
        {canViewHistory && <Button type="button" variant="outline" size="sm" aria-label={`View activity for ${member.displayName}`} onClick={() => openHistory(member)}>View activity</Button>}
      </li>)}</ul>}
      {hasMoreRoster && <div className="flex justify-center"><Button type="button" variant="outline" disabled={rosterLoadingMore} onClick={() => void loadRoster(rosterCursor, true)}>{rosterLoadingMore ? 'Loading…' : 'Load more people'}</Button></div>}
    </>}

    <p className="flex items-center gap-1 border-t pt-3 text-xs text-muted-foreground"><CircleHelp aria-hidden="true" className="h-3.5 w-3.5" /> App names come from local process-name sampling; no window titles, URLs, screenshots, keys, or input details are sent.</p>
  </section>;
}
