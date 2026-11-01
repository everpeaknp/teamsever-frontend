'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type SupportCase = { _id: string; category: string; title: string; details: string; resolution?: string; status: string; openedAt: string; closedAt?: string | null };
const categories = [['grievance', 'Grievance'], ['complaint', 'Complaint'], ['health_safety', 'Health & safety'], ['accommodation', 'Workplace accommodation'], ['return_to_work', 'Return to work']];

export function MyEmployeeSupport({ workspaceId }: { workspaceId: string }) {
  const [records, setRecords] = useState<SupportCase[]>([]); const [category, setCategory] = useState('grievance'); const [title, setTitle] = useState(''); const [details, setDetails] = useState(''); const [busy, setBusy] = useState(false);
  const load = async () => { try { const response = await api.get(`/workspaces/${workspaceId}/hr/my/relations-cases`); setRecords(response.data.data || []); } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load your support requests'); } };
  useEffect(() => { void load(); }, [workspaceId]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await api.post(`/workspaces/${workspaceId}/hr/my/relations-cases`, { category, title, details }); setTitle(''); setDetails(''); toast.success('Confidential request sent to HR'); await load(); } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not submit your request'); } finally { setBusy(false); } };
  return <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Private HR support</h2><p className="text-sm text-muted-foreground">Submit a confidential request. Details are encrypted and visible only to authorized HR staff.</p></div><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Request type<select value={category} onChange={event => setCategory(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3">{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Subject<Input required maxLength={180} value={title} onChange={event => setTitle(event.target.value)} /></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Details<textarea required maxLength={5000} rows={4} value={details} onChange={event => setDetails(event.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm" /></label><Button disabled={busy} className="sm:col-span-2">{busy ? 'Sending…' : 'Send confidential request'}</Button></form>{records.length ? <ul className="divide-y rounded-lg border">{records.map(record => <li key={record._id} className="space-y-1 p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{record.title}</p><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{record.status.replaceAll('_', ' ')}</span></div><p className="text-xs capitalize text-muted-foreground">{record.category.replaceAll('_', ' ')} · Sent {new Date(record.openedAt).toLocaleDateString()}</p><p className="whitespace-pre-wrap text-sm">{record.details}</p>{record.resolution && <p className="rounded-md bg-muted p-2 text-sm"><strong>HR response:</strong> {record.resolution}</p>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No HR support requests yet.</p>}</CardContent></Card>;
}
