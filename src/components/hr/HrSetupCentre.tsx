'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { confirmHrEmployee, getHrSetupGaps, getHrSetupReadiness, syncHrMembers, updateHrSetupPreference, type HrSetupEmployeeGap, type HrSetupReadiness, type HrSetupStepId } from '@/lib/hrSetup';

const PAGE_SIZE = 10;
const statusText = (status: string) => status === 'complete' ? 'Complete' : status === 'unavailable' ? 'Not included' : status === 'optional' ? 'Optional' : 'Needs attention';
const fieldLabel = (field: string) => field.replace(/([A-Z])/g, ' $1').replaceAll('_', ' ').trim();

export function HrSetupCentre({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<HrSetupReadiness | null>(null);
  const [gaps, setGaps] = useState<HrSetupEmployeeGap[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [selected, setSelected] = useState<HrSetupStepId>('members');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [summary, gapPage] = await Promise.all([getHrSetupReadiness(workspaceId), getHrSetupGaps(workspaceId, { status: filter, page, limit: PAGE_SIZE })]);
      setData(summary); setGaps(gapPage.data); setPagination(gapPage.pagination);
    } catch (caught: any) { setError(caught?.response?.data?.message || 'HR setup could not be loaded'); }
    finally { setLoading(false); }
  }, [workspaceId, filter, page]);
  useEffect(() => { void load(); }, [load]);
  const run = async (operation: () => Promise<unknown>) => {
    setWorking(true); setError('');
    try { await operation(); await load(); }
    catch (caught: any) { setError(caught?.response?.data?.message || 'The setup change could not be saved'); }
    finally { setWorking(false); }
  };

  if (loading && !data) return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading HR setup</div>;
  if (error && !data) return <Card><CardContent className="flex flex-col items-center gap-4 py-12"><AlertCircle className="h-8 w-8 text-destructive" /><p>{error}</p><Button onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>;
  if (!data) return null;
  const step = data.steps.find(item => item.id === selected) || data.steps[0];
  const list = <GapList gaps={gaps} workspaceId={workspaceId} working={working} confirm={id => run(() => confirmHrEmployee(workspaceId, id))} pagination={pagination} onPage={setPage} />;

  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-3"><Readiness label="Core" value={data.readiness.core === 'ready' ? 'Ready' : 'Core needs attention'} /><Readiness label="Operations" value={data.readiness.operations === 'ready' ? 'Ready' : data.readiness.operations === 'not_configured' ? 'Not configured' : 'Needs attention'} /><Readiness label="Payroll" value={data.readiness.payroll === 'unavailable' ? 'Payroll not included' : data.readiness.payroll === 'ready' ? 'Ready' : 'Needs attention'} /></section>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
    <div className="grid gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
      <nav aria-label="HR setup steps" className="space-y-2">{data.steps.map((item, index) => <button key={item.id} onClick={() => { setSelected(item.id); setPage(1); }} className={`flex w-full gap-3 rounded-xl border p-3 text-left ${selected === item.id ? 'border-primary bg-primary/5' : ''}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs">{item.status === 'complete' ? <Check className="h-4 w-4" /> : index + 1}</span><span><span className="block font-medium">{item.title}</span><span className="text-xs text-muted-foreground">{statusText(item.status)}</span></span></button>)}</nav>
      <Card><CardHeader><CardTitle>{step.title}</CardTitle><p className="text-sm text-muted-foreground">{step.summary}</p></CardHeader><CardContent className="space-y-5">
        {selected === 'members' && <><div className="grid gap-3 sm:grid-cols-3"><Count label="Workspace members" value={data.members.total} /><Count label="Employee records" value={data.members.enrolled} /><Count label="Need enrolment" value={data.members.unenrolled} /></div><Button disabled={working || data.members.unenrolled === 0} onClick={() => void run(() => syncHrMembers(workspaceId))}><Users className="mr-2 h-4 w-4" />Enrol missing members</Button>{list}</>}
        {selected === 'employment' && <><select aria-label="Employee gap filter" className="rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">All employees</option><option value="unreviewed">Awaiting review</option><option value="missing_core">Missing core details</option><option value="missing_private">Missing private details</option><option value="missing_compensation">Missing compensation</option></select>{list}</>}
        {selected === 'leave_and_schedules' && <><div className="grid gap-3 sm:grid-cols-2"><Count label="Active leave policies" value={data.configuration.activeLeavePolicies} /><Count label="Active schedules" value={data.configuration.activeSchedules} /></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href={`/workspace/${workspaceId}/hr/leaves`}>Leave policies</Link></Button><Button asChild variant="outline"><Link href={`/workspace/${workspaceId}/hr/schedules`}>Schedules</Link></Button></div><ExternalControl domain="leavePolicies" label="Leave policies" workspaceId={workspaceId} working={working} run={run} /><ExternalControl domain="schedules" label="Work schedules" workspaceId={workspaceId} working={working} run={run} /></>}
        {selected === 'compensation_and_private' && (data.readiness.payroll === 'unavailable' ? <div className="rounded-xl border bg-muted/30 p-4"><h3 className="font-medium">Payroll is not included in this workspace plan</h3><p className="mt-1 text-sm text-muted-foreground">It is not marked incomplete or managed elsewhere.</p></div> : <><Button asChild variant="outline"><Link href={`/workspace/${workspaceId}/hr/payroll`}>Open payroll</Link></Button><ExternalControl domain="payroll" label="Payroll" workspaceId={workspaceId} working={working} run={run} /></>)}
        {selected === 'history' && <><p className="text-sm">Already connected — Tasko reuses these records directly; nothing is copied.</p><div className="grid gap-3 sm:grid-cols-3"><Count label="Time entries" value={data.history.timeEntries} /><Count label="Leave requests" value={data.history.leaveRequests} /><Count label="Tasks" value={data.history.tasks} /></div></>}
      </CardContent></Card>
    </div>
  </div>;
}

function ExternalControl({ domain, label, workspaceId, working, run }: { domain: 'leavePolicies' | 'schedules' | 'payroll'; label: string; workspaceId: string; working: boolean; run: (operation: () => Promise<unknown>) => Promise<void> }) {
  const [reason, setReason] = useState('');
  return <div className="rounded-xl border p-4"><h3 className="font-medium">{label} managed outside Tasko</h3><p className="mt-1 text-sm text-muted-foreground">Use this only when this HR-enabled workspace manages {label.toLowerCase()} in another system. Tasko will stop treating this area as incomplete.</p><textarea aria-label={`${label} external management reason`} className="mt-3 min-h-20 w-full rounded-md border p-3" placeholder="Name the external process and why it is used" value={reason} onChange={event => setReason(event.target.value)} /><Button className="mt-2" variant="outline" disabled={working || !reason.trim()} onClick={() => void run(() => updateHrSetupPreference(workspaceId, domain, 'external', reason.trim()))}>Mark {label.toLowerCase()} as external</Button></div>;
}

function Readiness({ label, value }: { label: string; value: string }) { return <Card><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-2 font-semibold">{value}</p></CardContent></Card>; }
function Count({ label, value }: { label: string; value: number | null }) { return <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value == null ? 'Restricted' : value}</p></div>; }
function GapList({ gaps, workspaceId, working, confirm, pagination, onPage }: { gaps: HrSetupEmployeeGap[]; workspaceId: string; working: boolean; confirm: (id: string) => Promise<unknown>; pagination: { page: number; total: number; pages: number }; onPage: (page: number) => void }) {
  return <div className="space-y-3"><div className="space-y-2">{gaps.length === 0 ? <p className="border border-dashed p-6 text-center text-sm text-muted-foreground">No employee gaps match this view.</p> : gaps.map(gap => <div key={gap.userId} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{gap.displayName}</p><p className="break-words text-xs text-muted-foreground">{gap.reviewState === 'unenrolled' ? 'Not enrolled' : gap.missingCore.length ? `Missing: ${gap.missingCore.map(fieldLabel).join(', ')}` : 'Ready for confirmation'}</p></div><div className="flex gap-2">{gap.employeeId && <Button asChild size="sm" variant="outline"><Link href={`/workspace/${workspaceId}/hr/people?employeeId=${gap.employeeId}`}>Review</Link></Button>}{gap.employeeId && gap.reviewState !== 'reviewed' && gap.missingCore.length === 0 && <Button size="sm" disabled={working} onClick={() => void confirm(gap.employeeId!)}>Confirm</Button>}</div></div>)}</div>{pagination.pages > 1 && <div className="flex items-center justify-between text-sm"><span>{pagination.total} employees · page {pagination.page} of {pagination.pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next</Button></div></div>}</div>;
}
