'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock3, Monitor } from 'lucide-react';
import { api } from '@/lib/axios';
import { formatAppLabel, formatAppTimer } from '@/components/attendance/desktopAppUsage';

type ForegroundApp = {
  appId: string | null;
  presenceStatus: 'active' | 'afk';
  startedAt: string;
  reportedAt: string;
};

type PublicPresence = {
  clockedIn: boolean;
  clockedInAt: string | null;
  foregroundApp: ForegroundApp | null;
};

function elapsedSince(value: string | null, now: number) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : 0;
}

export function PublicClockPresence({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const [presence, setPresence] = useState<PublicPresence | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const response = await api.get(
          `/attendance/workspace/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}/public-presence`,
        );
        const data = response.data?.data;
        if (!mounted || typeof data?.clockedIn !== 'boolean') return;
        setPresence({
          clockedIn: data.clockedIn,
          clockedInAt: typeof data.clockedInAt === 'string' ? data.clockedInAt : null,
          foregroundApp: data.foregroundApp && typeof data.foregroundApp === 'object'
            ? data.foregroundApp
            : null,
        });
        setUnavailable(false);
      } catch {
        if (mounted) setUnavailable(true);
      }
    };

    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      mounted = false;
      window.clearInterval(refreshTimer);
    };
  }, [workspaceId, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!presence) {
    if (!unavailable) return null;
    return (
      <div role="status" className="my-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Activity className="h-3.5 w-3.5 shrink-0" />
        Work presence unavailable
      </div>
    );
  }

  if (!presence.clockedIn) return null;

  const app = presence.foregroundApp;
  const shiftTimer = formatAppTimer(elapsedSince(presence.clockedInAt, now));
  const appTimer = app ? formatAppTimer(elapsedSince(app.startedAt, now)) : null;
  const afk = app?.presenceStatus === 'afk';

  return (
    <section
      aria-label="Public work presence"
      className="my-2 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200/70 py-2.5 text-xs dark:border-white/10 sm:gap-x-6"
      title="Visible to workspace members"
    >
      <div className="inline-flex shrink-0 items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Clocked in</span>
      </div>

      <div aria-label="Shift duration" className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400" title="Time since clock-in">
        <Clock3 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{shiftTimer}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-slate-700 dark:text-slate-300">
        {app ? (
          <>
            <Monitor className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">{app.appId ? formatAppLabel(app.appId) : 'App unavailable'}</span>
            <span className={`shrink-0 font-medium ${afk ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{afk ? 'AFK' : 'Active'}</span>
            <span className="shrink-0 font-mono tabular-nums text-slate-500 dark:text-slate-400">{appTimer}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Activity className="h-3.5 w-3.5 shrink-0" />
            Desktop app not reporting
          </span>
        )}
      </div>
    </section>
  );
}
