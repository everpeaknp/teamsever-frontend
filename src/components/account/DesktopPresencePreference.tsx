'use client';

import { useEffect, useState } from 'react';
import { Loader2, MonitorCheck } from 'lucide-react';
import { getDesktopPresencePreference, setDesktopPresencePreference } from '@/lib/desktopAttendance';
import { Switch } from '@/components/ui/switch';

export function DesktopPresencePreference() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void getDesktopPresencePreference().then((value) => { if (active) setEnabled(value); }).catch(() => {
      if (active) setError('Could not load desktop presence settings.');
    });
    return () => { active = false; };
  }, []);

  const update = async (next: boolean) => {
    if (enabled === null || saving || next === enabled) return;
    setSaving(true);
    setError('');
    try {
      const saved = await setDesktopPresencePreference(next);
      setEnabled(saved);
      if (!saved) await window.teamseverDesktop?.setMonitoringEnabled(false).catch(() => undefined);
      window.dispatchEvent(new CustomEvent('teamsever:desktop-presence-preference-changed'));
    } catch {
      setError('Could not update desktop presence. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262626] dark:bg-[#1a1a1a]">
      <div className="flex items-start justify-between gap-5">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MonitorCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Desktop presence</h3>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Share desktop app and Active/AFK presence, and link mobile shifts to this desktop. Turning this off stops presence and shift linking; clock-in and clock-out remain available.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            aria-label="Desktop presence"
            checked={enabled ?? false}
            disabled={enabled === null || saving}
            onCheckedChange={(checked) => void update(checked)}
          />
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}
