'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Entry = { _id: string; startTime: string; endTime: string; duration?: number };
type Correction = { _id: string; requestedStart: string; requestedEnd: string; originalStart?: string; originalEnd?: string; reason: string; status: string; reviewNote?: string; createdAt: string; reviewedAt?: string };
const localInput = (value: string | Date) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export function AttendanceCorrectionSelfService({ workspaceId }: { workspaceId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [entryId, setEntryId] = useState('');
  const [requestedStart, setRequestedStart] = useState('');
  const [requestedEnd, setRequestedEnd] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [entryResult, correctionResult] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/my/attendance-correction-entries`),
        api.get(`/workspaces/${workspaceId}/hr/my/attendance-corrections`),
      ]);
      setEntries(entryResult.data.data || []); setCorrections(correctionResult.data.data || []);
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load attendance correction requests'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const chooseEntry = (value: string) => {
    setEntryId(value);
    const entry = entries.find(item => item._id === value);
    if (entry) { setRequestedStart(localInput(entry.startTime)); setRequestedEnd(localInput(entry.endTime)); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/my/attendance-corrections`, {
        ...(entryId ? { timeEntryId: entryId } : {}),
        requestedStart: new Date(requestedStart).toISOString(),
        requestedEnd: new Date(requestedEnd).toISOString(), reason,
      });
      toast.success('Attendance correction sent for manager review'); setEntryId(''); setRequestedStart(''); setRequestedEnd(''); setReason(''); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not submit attendance correction'); }
    finally { setSaving(false); }
  };

  return <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Attendance corrections</h2><p className="text-sm text-muted-foreground">Ask a manager to correct a clock record or add a missed shift. Approved changes update the existing attendance records.</p></div>
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium sm:col-span-2">Clock record (optional)<select value={entryId} onChange={event => chooseEntry(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Missed shift / no existing entry</option>{entries.map(entry => <option key={entry._id} value={entry._id}>{new Date(entry.startTime).toLocaleString()} – {new Date(entry.endTime).toLocaleTimeString()}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Correct clock-in<Input required type="datetime-local" value={requestedStart} onChange={event => setRequestedStart(event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Correct clock-out<Input required type="datetime-local" value={requestedEnd} onChange={event => setRequestedEnd(event.target.value)} /></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Reason<textarea required minLength={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} className="min-h-20 w-full rounded-md border bg-background p-3 text-sm" placeholder="Explain what needs correcting" /></label><Button disabled={saving || !requestedStart || !requestedEnd} className="sm:col-span-2">{saving ? 'Submitting…' : 'Submit correction request'}</Button></form>
    <section className="space-y-2 border-t pt-4"><h3 className="font-medium">My requests</h3>{loading ? <p className="text-sm text-muted-foreground">Loading requests…</p> : corrections.length ? corrections.map(item => <article key={item._id} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><strong className="capitalize">{item.status}</strong><span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-1 text-sm">{new Date(item.requestedStart).toLocaleString()} – {new Date(item.requestedEnd).toLocaleTimeString()}</p><p className="text-sm text-muted-foreground">{item.reason}</p>{item.reviewNote && <p className="mt-2 text-sm">Manager note: {item.reviewNote}</p>}</article>) : <p className="text-sm text-muted-foreground">No correction requests submitted.</p>}</section>
  </CardContent></Card>;
}
