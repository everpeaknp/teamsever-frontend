'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { loadAllHrPages } from '@/lib/hrEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type ChecklistItem = { _id: string; title: string; category: string; required: boolean; dueAt?: string; status: string; note?: string; documentIds?: { _id: string; name: string }[] };
type Onboarding = { _id: string; status: string; probationEndDate?: string; probationOutcome: string; probationNote?: string; items: ChecklistItem[]; employee?: { _id: string; employeeNumber: string; jobTitle?: string; user?: { name: string; email: string } } };
type EligibleEmployee = { _id: string; employeeNumber: string; jobTitle?: string; probationEndDate?: string; user?: { name: string } };
const humanize = (value: string) => value.replaceAll('_', ' ');

export default function OnboardingPage() {
  const workspaceId = useParams().id as string;
  const [cases, setCases] = useState<Onboarding[]>([]);
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => { setLoading(true); try { const [response, eligible] = await Promise.all([api.get(`/workspaces/${workspaceId}/hr/onboarding`), loadAllHrPages<EligibleEmployee>(`/workspaces/${workspaceId}/hr/onboarding/eligible-employees`)]); setCases(response.data.data || []); setEligibleEmployees(eligible); } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load onboarding records'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [workspaceId]);

  const updateItem = async (onboardingId: string, itemId: string, status: string, note?: string) => {
    setBusy(itemId);
    try { await api.patch(`/workspaces/${workspaceId}/hr/onboarding/${onboardingId}/items/${itemId}`, { status, note }); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update checklist item'); }
    finally { setBusy(null); }
  };
  const createCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formData = new FormData(event.currentTarget); const employeeId = String(formData.get('employeeId') || ''); if (!employeeId) return;
    setBusy('create');
    try { await api.post(`/workspaces/${workspaceId}/hr/onboarding`, { employeeId, probationEndDate: formData.get('probationEndDate') || undefined }); toast.success('Onboarding checklist created'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create onboarding checklist'); }
    finally { setBusy(null); }
  };
  const addItem = async (onboardingId: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const formData = new FormData(form); const title = String(formData.get('title') || '').trim(); if (!title) return;
    setBusy(onboardingId);
    try { await api.post(`/workspaces/${workspaceId}/hr/onboarding/${onboardingId}/items`, { title, category: formData.get('category'), dueAt: formData.get('dueAt') || null, required: formData.get('required') === 'on' }); toast.success('Checklist item added'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not add checklist item'); }
    finally { setBusy(null); }
  };
  const probationAction = async (onboarding: Onboarding, outcome: string) => {
    const note = window.prompt(`Note for ${outcome} probation`); if (note === null) return;
    const probationEndDate = outcome === 'extended' ? window.prompt('New probation end date (YYYY-MM-DD)', onboarding.probationEndDate?.slice(0, 10) || '') : undefined;
    if (outcome === 'extended' && !probationEndDate) return;
    setBusy(onboarding._id);
    try { await api.patch(`/workspaces/${workspaceId}/hr/onboarding/${onboarding._id}/probation`, { outcome, note, probationEndDate }); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update probation outcome'); }
    finally { setBusy(null); }
  };
  const reminders = useMemo(() => cases.flatMap(onboarding => {
    if (!onboarding.probationEndDate || onboarding.probationOutcome !== 'pending') return [];
    const remaining = Math.ceil((new Date(onboarding.probationEndDate).getTime() - Date.now()) / 86400000);
    return remaining <= 30 ? [{ onboarding, remaining }] : [];
  }).sort((a, b) => a.remaining - b.remaining), [cases]);

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link><Link href={`/workspace/${workspaceId}/hr/recruiting`} className="text-sm font-medium text-primary hover:underline">Hiring pipeline</Link></div>
    <header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><ClipboardCheck className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Onboarding & probation</h1><p className="mt-1 text-sm text-muted-foreground">Track required documents, policy sign-off, equipment, access setup, and probation outcomes.</p></div></header>
    <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Start onboarding for an existing employee</h2><form onSubmit={createCase} className="flex flex-wrap items-end gap-3"><label className="min-w-64 flex-1 space-y-1 text-sm font-medium">Employee<select required name="employeeId" className="h-10 w-full rounded-md border bg-background px-3" defaultValue=""><option value="" disabled>Select employee without a checklist</option>{eligibleEmployees.map(employee => <option key={employee._id} value={employee._id}>{employee.user?.name || 'Employee'} · {employee.employeeNumber}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Probation end date<Input name="probationEndDate" type="date" /></label><Button disabled={busy === 'create' || eligibleEmployees.length === 0}>{eligibleEmployees.length ? 'Create standard checklist' : 'All employees have a checklist'}</Button></form><p className="mt-2 text-xs text-muted-foreground">Creates document, policy, equipment, and account setup steps. You can add workspace-specific steps to the checklist below.</p></CardContent></Card>
    {!loading && reminders.length > 0 && <Card><CardContent className="p-5"><h2 className="font-semibold">Probation reminders</h2><div className="mt-3 space-y-2">{reminders.map(({ onboarding, remaining }) => <div key={onboarding._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950/30"><span><strong>{onboarding.employee?.user?.name || 'Employee'}</strong> · {remaining < 0 ? `${Math.abs(remaining)} days overdue` : remaining === 0 ? 'Due today' : `Due in ${remaining} days`}</span><div className="flex gap-2"><Button size="sm" disabled={!!busy} onClick={() => probationAction(onboarding, 'confirmed')}>Confirm</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={() => probationAction(onboarding, 'extended')}>Extend</Button><Button size="sm" variant="destructive" disabled={!!busy} onClick={() => probationAction(onboarding, 'ended')}>End employment</Button></div></div>)}</div></CardContent></Card>}
    {loading ? <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading onboarding records</div> : cases.length ? <section className="space-y-4" aria-label="Employee onboarding cases">{cases.map(onboarding => {
      const done = onboarding.items.filter(item => ['completed', 'waived'].includes(item.status)).length;
      return <Card key={onboarding._id}><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{onboarding.employee?.user?.name || 'Employee'} <span className="font-normal text-muted-foreground">· {onboarding.employee?.employeeNumber}</span></h2><p className="text-sm text-muted-foreground">{onboarding.employee?.jobTitle || 'Role not set'} · {done}/{onboarding.items.length} onboarding steps complete</p></div><span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{humanize(onboarding.status)}</span></div>
        <div className="space-y-2">{onboarding.items.map(item => <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="min-w-0"><p className="font-medium">{item.title}{item.required && <span className="ml-2 text-xs text-red-600">Required</span>}</p><p className="text-xs capitalize text-muted-foreground">{humanize(item.category)}{item.dueAt ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}` : ''} · {humanize(item.status)}{item.documentIds?.length ? ` · ${item.documentIds.length} confidential document(s) attached` : ''}</p>{item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}</div><div className="flex gap-2">{item.status !== 'completed' && <Button size="sm" disabled={!!busy} onClick={() => updateItem(onboarding._id, item._id, 'completed')}>{busy === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Complete'}</Button>}{item.status !== 'waived' && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { const note = window.prompt('Reason for waiving this item'); if (note?.trim()) void updateItem(onboarding._id, item._id, 'waived', note); }}>Waive</Button>}</div></div>)}</div>
        <form onSubmit={event => void addItem(onboarding._id, event)} className="flex flex-wrap items-end gap-2 border-t pt-4"><label className="min-w-48 flex-1 space-y-1 text-xs font-medium">New checklist step<Input name="title" required placeholder="e.g. Issue access card" /></label><label className="space-y-1 text-xs font-medium">Category<select name="category" className="h-10 rounded-md border bg-background px-3 text-sm">{['document', 'policy', 'equipment', 'account_setup', 'training', 'other'].map(category => <option key={category} value={category}>{humanize(category)}</option>)}</select></label><label className="space-y-1 text-xs font-medium">Due date<Input name="dueAt" type="date" /></label><label className="flex h-10 items-center gap-2 px-2 text-sm"><input type="checkbox" name="required" defaultChecked />Required</label><Button type="submit" variant="outline" disabled={busy === onboarding._id}>Add step</Button></form>
        {onboarding.probationOutcome !== 'pending' ? <p className="text-sm text-muted-foreground">Probation: {humanize(onboarding.probationOutcome)}{onboarding.probationNote ? ` · ${onboarding.probationNote}` : ''}</p> : onboarding.probationEndDate ? <p className="text-sm text-muted-foreground">Probation decision due by {new Date(onboarding.probationEndDate).toLocaleDateString()}.</p> : null}
      </CardContent></Card>;
    })}</section> : <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No onboarding cases yet. Accepted candidates can be converted from the hiring pipeline.</CardContent></Card>}
  </main>;
}
