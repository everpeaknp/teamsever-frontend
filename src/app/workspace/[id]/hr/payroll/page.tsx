'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, ReceiptText, Settings2, History } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { StatutoryPolicySettingsTab } from '@/components/hr/StatutoryPolicySettingsTab';

type PayrollRun = { _id: string; periodStart: string; periodEnd: string; currency: string; status: string; revision: number; totals: { netAmount: string; employeeCount: number }; createdBy?: { name?: string } };

const lastMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { periodStart: localDate(first), periodEnd: localDate(last) };
};
const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const lastCompleteDays = (days: number) => {
  const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - days + 1);
  return { periodStart: localDate(start), periodEnd: localDate(end) };
};

export default function PayrollPage() {
  const workspaceId = useParams().id as string;
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [period, setPeriod] = useState(lastMonth);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'runs' | 'statutory'>('runs');

  const load = async () => {
    setLoading(true);
    try { const response = await api.get(`/workspaces/${workspaceId}/hr/payroll-runs`); setRuns(response.data.data || []); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load payroll history'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try { await api.post(`/workspaces/${workspaceId}/hr/payroll-runs`, period); toast.success('Payroll draft created'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create payroll draft'); }
    finally { setCreating(false); }
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Employee directory</Link>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-3 text-primary"><ReceiptText className="h-6 w-6" /></span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-muted-foreground">Payroll periods, approvals, payslips, and dynamic statutory tax policies.</p>
        </div>
      </header>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'runs' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('runs')}
          className="flex items-center gap-1.5"
        >
          <ReceiptText className="h-4 w-4" />
          Payroll Runs
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeTab === 'statutory' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('statutory')}
          className="flex items-center gap-1.5"
        >
          <Settings2 className="h-4 w-4" />
          Statutory, Tax & Dual Calendar
        </Button>
      </div>
    </div>

    {activeTab === 'statutory' ? (
      <StatutoryPolicySettingsTab workspaceId={workspaceId} />
    ) : (
      <>
        <Card><CardContent className="p-5"><form onSubmit={createDraft} className="space-y-3"><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setPeriod(lastMonth())}>Previous calendar month</Button><Button type="button" size="sm" variant="outline" onClick={() => setPeriod(lastCompleteDays(7))}>Last 7 complete days</Button><Button type="button" size="sm" variant="outline" onClick={() => setPeriod(lastCompleteDays(14))}>Last 14 complete days</Button></div><div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm font-medium">Period start<Input required type="date" value={period.periodStart} onChange={(event) => setPeriod({ ...period, periodStart: event.target.value })} /></label><label className="space-y-1 text-sm font-medium">Period end<Input required type="date" value={period.periodEnd} onChange={(event) => setPeriod({ ...period, periodEnd: event.target.value })} /></label><Button disabled={creating}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Create payroll draft</Button></div></form><p className="mt-3 text-xs text-muted-foreground">Drafts use approved effective-dated compensation and workspace clock records. Monthly salary is prorated by calendar days for partial-month periods. Approved leave is shown for review; dynamic statutory contributions and tax slabs are applied automatically based on active workspace policies.</p></CardContent></Card>
        <section className="space-y-3" aria-label="Payroll history"><h2 className="text-lg font-semibold">Payroll history</h2>{loading ? <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading payroll runs</div> : runs.length ? runs.map((run) => <Link key={run._id} href={`/workspace/${workspaceId}/hr/payroll/${run._id}`}><Card className="transition-colors hover:border-primary/50"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{new Date(run.periodStart).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} – {new Date(run.periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}{run.revision > 1 ? ` · Revision ${run.revision}` : ''}</p><p className="text-sm text-muted-foreground">{run.totals.employeeCount} employees · {run.currency} {run.totals.netAmount}</p></div><span className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{run.status.replace('_', ' ')}</span></CardContent></Card></Link>) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No payroll runs yet. Select a monthly, weekly, fortnightly, or custom period above.</CardContent></Card>}</section>
      </>
    )}
  </main>;
}
