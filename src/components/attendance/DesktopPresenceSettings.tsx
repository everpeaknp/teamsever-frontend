'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/axios';

export function DesktopPresenceSettings({ workspaceId }: { workspaceId: string }) {
  const [threshold, setThreshold] = useState(5);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/attendance/workspace/${workspaceId}/desktop-presence-policy`)
      .then(({ data }) => {
        if (cancelled) return;
        setThreshold(data.data.policy.afkThresholdMinutes);
        setCanManage(!!data.data.canManage);
      })
      .catch((error) => { if (!cancelled) setMessage(error?.response?.data?.message || 'Could not load desktop presence settings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.put(`/attendance/workspace/${workspaceId}/desktop-presence-policy`, { afkThresholdMinutes: threshold });
      setThreshold(data.data.policy.afkThresholdMinutes);
      setMessage('AFK threshold saved.');
    } catch (error: any) {
      setMessage(error?.response?.data?.message || 'Could not save the AFK threshold.');
    } finally { setSaving(false); }
  };

  return <section className="space-y-3 rounded-xl border bg-card p-5" aria-label="Desktop presence policy">
    <div><h2 className="text-lg font-semibold">Desktop presence</h2><p className="text-sm text-muted-foreground">When a trusted desktop has monitoring consent during its own clocked-in shift, it reports active or AFK state and the foreground app name. It never records keys, text, mouse details, window titles, or screenshots.</p></div>
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-56 space-y-1"><label htmlFor="desktop-afk-threshold" className="text-sm font-medium">Mark AFK after (minutes)</label><Input id="desktop-afk-threshold" aria-label="Mark AFK after minutes" type="number" min={1} max={60} step={1} value={threshold} disabled={loading || !canManage} onChange={(event) => setThreshold(Number(event.target.value))} /></div>
      {canManage && <Button type="button" disabled={loading || saving || !Number.isInteger(threshold) || threshold < 1 || threshold > 60} onClick={() => void save()}>{saving ? 'Saving…' : 'Save AFK threshold'}</Button>}
    </div>
    {!canManage && !loading && <p className="text-sm text-muted-foreground">Only workspace owners and authorized attendance or address managers can change this setting.</p>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </section>;
}
