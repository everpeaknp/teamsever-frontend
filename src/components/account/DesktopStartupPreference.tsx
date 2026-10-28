'use client';

import { useEffect, useState } from 'react';
import { Loader2, Power } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export function DesktopStartupPreference() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const bridge = window.teamseverDesktop;
    if (!bridge?.getStartupPreference) { setLoading(false); return; }
    void bridge.getStartupPreference().then((value) => {
      if (!active) return;
      setSupported(value.supported);
      setEnabled(value.enabled);
    }).catch(() => { if (active) setError('Could not read the startup setting.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (!supported) return null;
  const update = async (next: boolean) => {
    const setter = window.teamseverDesktop?.setStartupPreference;
    if (!setter || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await setter(next);
      setEnabled(result.enabled);
    } catch {
      setError('Could not update launch-at-sign-in. Try again.');
    } finally { setSaving(false); }
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#262626] dark:bg-[#1a1a1a]">
    <div className="flex items-start justify-between gap-5">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Power aria-hidden="true" className="h-5 w-5" /></span>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Launch at sign-in</h3>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">Open Teamsever automatically when you sign in to Windows. You can also manage it in Windows Startup Apps.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {(loading || saving) && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Switch aria-label="Launch Teamsever at Windows sign-in" checked={enabled} disabled={loading || saving} onCheckedChange={(checked) => void update(checked)} />
      </div>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </section>;
}
