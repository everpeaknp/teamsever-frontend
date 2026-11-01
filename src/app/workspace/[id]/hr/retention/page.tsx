'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Policy = { documentReviewDays: number | null; unsuccessfulCandidateReviewDays: number | null; closedCaseReviewDays: number | null; updatedAt: string | null; history: { actor: string | null; at: string; documentReviewDays: number | null; unsuccessfulCandidateReviewDays: number | null; closedCaseReviewDays: number | null }[] };
type ReviewItem = { recordType: 'document' | 'candidate' | 'relations_case'; recordId: string; category?: string; status?: string; employeeId?: string; createdAt: string; dueAt: string; reason: string; legalHold: boolean; hold: { reason: string; placedAt: string; placedBy: string | null } | null };
type Hold = { _id: string; recordType: string; recordId: string; reason: string; createdAt: string; clearedAt: string | null; clearReason?: string | null; createdBy?: { name?: string }; clearedBy?: { name?: string } };

const blankPolicy: Policy = { documentReviewDays: null, unsuccessfulCandidateReviewDays: null, closedCaseReviewDays: null, updatedAt: null, history: [] };
const labels: Record<ReviewItem['recordType'], string> = { document: 'Employee document', candidate: 'Unsuccessful candidate', relations_case: 'Closed relations case' };

export default function HrRetentionPage() {
  const workspaceId = useParams().id as string;
  const [policy, setPolicy] = useState<Policy>(blankPolicy);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const [settings, queue, holdResponse] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/retention`),
        api.get(`/workspaces/${workspaceId}/hr/retention/reviews`),
        api.get(`/workspaces/${workspaceId}/hr/retention/holds`),
      ]);
      setPolicy({ ...blankPolicy, ...settings.data.data });
      setReviews(queue.data.data?.items || []);
      setHolds(holdResponse.data.data || []);
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load HR retention controls'); }
  };

  useEffect(() => { let active = true; setLoading(true); void load().finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [workspaceId]);

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    const value = (days: number | null) => days === null || days === ('' as unknown as number) ? null : Number(days);
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/hr/retention`, {
        documentReviewDays: value(policy.documentReviewDays),
        unsuccessfulCandidateReviewDays: value(policy.unsuccessfulCandidateReviewDays),
        closedCaseReviewDays: value(policy.closedCaseReviewDays),
      });
      setPolicy({ ...blankPolicy, ...response.data.data }); toast.success('Retention review periods saved'); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not save retention review periods'); }
    finally { setSaving(false); }
  };

  const placeHold = async (item: ReviewItem) => {
    const reason = window.prompt(`Why should this ${labels[item.recordType].toLowerCase()} be placed on legal hold?`);
    if (!reason?.trim()) return;
    setBusy(item.recordId);
    try { await api.post(`/workspaces/${workspaceId}/hr/retention/holds`, { recordType: item.recordType, recordId: item.recordId, reason: reason.trim() }); toast.success('Legal hold recorded'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not place legal hold'); }
    finally { setBusy(null); }
  };

  const clearHold = async (hold: Hold) => {
    const reason = window.prompt('Why is this legal hold being released?');
    if (!reason?.trim()) return;
    setBusy(hold._id);
    try { await api.delete(`/workspaces/${workspaceId}/hr/retention/holds/${hold._id}`, { data: { reason: reason.trim() } }); toast.success('Legal hold released'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not release legal hold'); }
    finally { setBusy(null); }
  };

  const editDays = (field: keyof Pick<Policy, 'documentReviewDays' | 'unsuccessfulCandidateReviewDays' | 'closedCaseReviewDays'>, raw: string) => setPolicy(previous => ({ ...previous, [field]: raw === '' ? null : Number(raw) }));
  const activeHolds = holds.filter(hold => !hold.clearedAt);

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link>
    <header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Retention & legal holds</h1><p className="mt-1 text-sm text-muted-foreground">Configure review periods, see records due for review, and preserve records under an active hold.</p></div></header>
    <Card><CardContent className="space-y-4 p-5"><div><h2 className="font-semibold">Review periods</h2><p className="mt-1 text-sm text-muted-foreground">Set the number of days before records enter the review queue. These are review dates, not automatic deletion deadlines. Blank means no configured period. Document expiry dates still enter review when reached.</p></div>
      <form onSubmit={savePolicy} className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">Employee documents (days)<Input type="number" min={1} max={36500} placeholder="No period" value={policy.documentReviewDays ?? ''} onChange={event => editDays('documentReviewDays', event.target.value)} /></label>
        <label className="space-y-1 text-sm font-medium">Unsuccessful candidates (days)<Input type="number" min={1} max={36500} placeholder="No period" value={policy.unsuccessfulCandidateReviewDays ?? ''} onChange={event => editDays('unsuccessfulCandidateReviewDays', event.target.value)} /></label>
        <label className="space-y-1 text-sm font-medium">Closed relations cases (days)<Input type="number" min={1} max={36500} placeholder="No period" value={policy.closedCaseReviewDays ?? ''} onChange={event => editDays('closedCaseReviewDays', event.target.value)} /></label>
        <div className="sm:col-span-3"><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save review periods</Button>{policy.updatedAt && <span className="ml-3 text-xs text-muted-foreground">Updated {new Date(policy.updatedAt).toLocaleString()}</span>}</div>
      </form>
      {policy.history?.length ? <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Policy change history ({policy.history.length})</summary><ul className="mt-2 space-y-2">{policy.history.map((entry, index) => <li key={`${entry.at}-${index}`} className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()} · {entry.actor || 'HR'} · Documents {entry.documentReviewDays ?? 'off'} days · Candidates {entry.unsuccessfulCandidateReviewDays ?? 'off'} days · Closed cases {entry.closedCaseReviewDays ?? 'off'} days</li>)}</ul></details> : null}
    </CardContent></Card>
    <section className="space-y-3"><div><h2 className="text-xl font-semibold">Due for review <span className="text-muted-foreground">({reviews.length})</span></h2><p className="text-sm text-muted-foreground">Review the applicable policy and record before deciding retention or disposal.</p></div>
      {loading ? <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading retention records</div> : reviews.length ? reviews.map(item => <Card key={`${item.recordType}:${item.recordId}`}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{labels[item.recordType]}</h3><span className="rounded-full bg-muted px-2 py-1 text-xs">{item.category || item.status || item.reason.replaceAll('_', ' ')}</span>{item.legalHold && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Legal hold</span>}</div><p className="mt-1 text-xs text-muted-foreground">Record {item.recordId} · Due {new Date(item.dueAt).toLocaleDateString()} · Created {new Date(item.createdAt).toLocaleDateString()}</p>{item.hold && <p className="mt-1 text-xs text-amber-800">Hold: {item.hold.reason}</p>}</div>{!item.legalHold && <Button size="sm" variant="outline" disabled={busy === item.recordId} onClick={() => void placeHold(item)}>Place legal hold</Button>}</CardContent></Card>) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No HR records are currently due for review.</CardContent></Card>}
    </section>
    <section className="space-y-3"><div><h2 className="text-xl font-semibold">Legal-hold register <span className="text-muted-foreground">({activeHolds.length} active)</span></h2><p className="text-sm text-muted-foreground">Active and released holds remain in the audit history.</p></div>{holds.length ? holds.map(hold => <Card key={hold._id}><CardContent className="flex flex-wrap items-center justify-between gap-4 p-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold capitalize">{hold.recordType.replaceAll('_', ' ')}</h3><span className={`rounded-full px-2 py-1 text-xs ${hold.clearedAt ? 'bg-muted text-muted-foreground' : 'bg-amber-100 text-amber-900'}`}>{hold.clearedAt ? 'Released' : 'Active'}</span></div><p className="mt-1 text-sm">{hold.reason}</p><p className="mt-1 text-xs text-muted-foreground">Record {hold.recordId} · Placed {new Date(hold.createdAt).toLocaleString()} by {hold.createdBy?.name || 'HR'}{hold.clearedAt ? ` · Released ${new Date(hold.clearedAt).toLocaleString()} by ${hold.clearedBy?.name || 'HR'}` : ''}</p>{hold.clearReason && <p className="mt-1 text-xs text-muted-foreground">Release reason: {hold.clearReason}</p>}</div>{!hold.clearedAt && <Button size="sm" variant="outline" disabled={busy === hold._id} onClick={() => void clearHold(hold)}>Release hold</Button>}</CardContent></Card>) : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No legal holds have been recorded.</CardContent></Card>}</section>
  </main>;
}
