'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock3, Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Person = { name?: string; email?: string };
type Correction = {
  _id: string;
  employee?: { employeeNumber?: string; department?: string; jobTitle?: string; user?: Person };
  requester?: Person;
  requestedStart: string;
  requestedEnd: string;
  originalStart?: string | null;
  originalEnd?: string | null;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: Person;
  reviewNote?: string;
};

const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';

export default function AttendanceCorrectionsPage() {
  const workspaceId = useParams().id as string;
  const [items, setItems] = useState<Correction[]>([]);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/workspaces/${workspaceId}/hr/attendance-corrections`, { params: { status } });
      setItems(response.data.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load attendance correction requests');
      setItems([]);
    } finally { setLoading(false); }
  }, [workspaceId, status]);

  useEffect(() => { void load(); }, [load]);

  const decide = async (item: Correction, decision: 'approve' | 'reject') => {
    const note = (notes[item._id] || '').trim();
    if (decision === 'reject' && !note) { toast.error('Add a reason before rejecting this request'); return; }
    setWorkingId(item._id);
    try {
      await api.patch(`/workspaces/${workspaceId}/hr/attendance-corrections/${item._id}/decision`, { decision, note });
      toast.success(decision === 'approve' ? 'Attendance correction approved and applied' : 'Attendance correction rejected');
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not review attendance correction'); }
    finally { setWorkingId(''); }
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
    </div>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold tracking-tight">Attendance corrections</h1><p className="mt-1 text-sm text-muted-foreground">Review employee requests to fix clock times or add a missed shift. Approved requests update the workspace attendance records.</p></div>
      <label className="space-y-1 text-sm font-medium">Show<select value={status} onChange={event => setStatus(event.target.value)} className="block h-10 min-w-40 rounded-md border bg-background px-3"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All requests</option></select></label>
    </header>
    {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading requests</div> : items.length ? <section className="space-y-3">{items.map(item => {
      const employeeName = item.employee?.user?.name || item.requester?.name || 'Employee';
      const pending = item.status === 'pending';
      return <Card key={item._id}><CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{employeeName}</h2>{item.employee?.employeeNumber && <span className="rounded-full bg-muted px-2 py-1 text-xs">{item.employee.employeeNumber}</span>}<span className={`rounded-full px-2 py-1 text-xs capitalize ${pending ? 'bg-amber-100 text-amber-900' : item.status === 'approved' ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground'}`}>{item.status}</span></div><p className="mt-1 text-sm text-muted-foreground">{[item.employee?.jobTitle, item.employee?.department, item.requester?.email].filter(Boolean).join(' · ')}</p></div><span className="text-xs text-muted-foreground">Requested {dateTime(item.createdAt)}</span></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs font-medium text-muted-foreground">Requested interval</p><p className="mt-1 flex items-start gap-2 text-sm"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{dateTime(item.requestedStart)}<br />to {dateTime(item.requestedEnd)}</span></p></div><div className="rounded-lg border p-3"><p className="text-xs font-medium text-muted-foreground">Existing interval</p><p className="mt-1 text-sm">{item.originalStart ? <>{dateTime(item.originalStart)}<br />to {dateTime(item.originalEnd)}</> : 'Missed shift · no existing clock record'}</p></div></div>
        <div><p className="text-xs font-medium text-muted-foreground">Employee reason</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.reason}</p></div>
        {pending ? <div className="space-y-3 border-t pt-4"><label className="block space-y-1 text-sm font-medium">Review note {status === 'pending' && <span className="font-normal text-muted-foreground">(required for rejection)</span>}<textarea maxLength={1000} value={notes[item._id] || ''} onChange={event => setNotes(current => ({ ...current, [item._id]: event.target.value }))} className="min-h-20 w-full rounded-md border bg-background p-3 text-sm font-normal" placeholder="Optional note for approval, required reason for rejection" /></label><div className="flex flex-wrap gap-2"><Button disabled={workingId === item._id} onClick={() => void decide(item, 'approve')}>{workingId === item._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Approve and apply</Button><Button variant="outline" disabled={workingId === item._id || !(notes[item._id] || '').trim()} onClick={() => void decide(item, 'reject')}><X className="mr-2 h-4 w-4" />Reject</Button></div></div> : item.reviewedAt && <div className="border-t pt-3 text-sm text-muted-foreground"><p>Reviewed {dateTime(item.reviewedAt)}{item.reviewedBy?.name ? ` by ${item.reviewedBy.name}` : ''}</p>{item.reviewNote && <p className="mt-1">Note: {item.reviewNote}</p>}</div>}
      </CardContent></Card>;
    })}</section> : <Card><CardContent className="py-14 text-center"><Clock3 className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">No {status === 'all' ? '' : `${status} `}correction requests</h2><p className="mt-1 text-sm text-muted-foreground">Requests submitted by employees will appear here.</p></CardContent></Card>}
  </main>;
}
