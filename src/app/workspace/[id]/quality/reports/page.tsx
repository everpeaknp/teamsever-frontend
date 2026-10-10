'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReportView } from '@/components/quality/ReportView';
import { QualitySnapshot, useQualityCapabilities, useQualityLiveReport, useQualityPlans, useQualitySnapshots } from '@/hooks/queries/useQuality';
import { useSignOffQualityPlan } from '@/hooks/mutations/useQualityMutations';

export default function QualityReportsPage() {
  const workspaceId = useParams().id as string;
  const [planId, setPlanId] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [signoffError, setSignoffError] = useState('');
  const [snapshot, setSnapshot] = useState<QualitySnapshot | null>(null);
  const [snapshotPage, setSnapshotPage] = useState(1);
  const caps = useQualityCapabilities(workspaceId);
  const enabled = Boolean(caps.data?.canViewReport);
  const plans = useQualityPlans(workspaceId, 1, enabled);
  const live = useQualityLiveReport(workspaceId, planId, enabled && Boolean(planId));
  const snapshots = useQualitySnapshots(workspaceId, planId, snapshotPage, enabled && Boolean(planId));
  const signoff = useSignOffQualityPlan(workspaceId, planId);

  if (caps.isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading Quality…</div>;
  if (caps.isError || !enabled) return <div className="p-8 text-sm">QA reports are unavailable in this workspace.</div>;

  const saveSnapshot = async () => {
    setSignoffError('');
    try {
      const saved = await signoff.mutateAsync(exceptionReason.trim() || undefined);
      setSnapshot(saved);
      setExceptionReason('');
      toast.success('Report snapshot signed');
    } catch (caught: any) { setSignoffError(caught?.response?.data?.message || 'Could not sign this report.'); }
  };

  const downloadCsv = async () => {
    if (!snapshot) return;
    try {
      const response = await api.get(`/workspaces/${workspaceId}/quality/reports/snapshots/${snapshot._id}.csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qa-report-${snapshot._id}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Could not export the snapshot.'); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8">
    <div className="print:hidden"><Link href={`/workspace/${workspaceId}/quality`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Quality</Link></div>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">QA reports</h1><p className="mt-1 text-sm text-muted-foreground">Live release health and signed historical snapshots.</p></div><select aria-label="Select test plan" className="h-10 min-w-[220px] rounded-md border border-input bg-background px-3 text-sm print:hidden" value={planId} onChange={event => { setPlanId(event.target.value); setSnapshot(null); setSnapshotPage(1); }}><option value="">Select a plan</option>{plans.data?.data.map(plan => <option key={plan._id} value={plan._id}>{plan.name}</option>)}</select></div>
    {!planId ? <div className="rounded-xl border p-8 text-sm text-muted-foreground">Choose a plan to inspect results and blockers.</div> : <>
      {snapshot && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"><div><div className="text-sm font-semibold">Signed snapshot · {new Date(snapshot.signedAt).toLocaleString()}</div><p className="text-xs text-muted-foreground">This copy will not change when later runs or bugs change.</p></div><div className="flex gap-2 print:hidden"><Button variant="outline" size="sm" onClick={downloadCsv}><Download className="mr-1 h-4 w-4" />CSV</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print / PDF</Button><Button variant="ghost" size="sm" onClick={() => setSnapshot(null)}>Back to live</Button></div></div>}
      {snapshot?.exceptionReason && <div className="rounded-lg border border-amber-300 p-4 text-sm"><strong>Signoff exception:</strong> {snapshot.exceptionReason}</div>}
      {snapshot ? <ReportView report={snapshot.report} /> : live.isLoading ? <div className="rounded-lg border p-6 text-sm text-muted-foreground">Loading report…</div> : live.isError ? <div role="alert" className="rounded-lg border p-6 text-sm">Could not load this report. <Button variant="link" onClick={() => live.refetch()}>Retry</Button></div> : live.data && <ReportView report={live.data} />}
      {!snapshot && caps.data?.canSignOff && live.data && <div className="space-y-3 rounded-xl border bg-card p-4 print:hidden"><div><h2 className="text-sm font-semibold">Sign a snapshot</h2><p className="text-xs text-muted-foreground">A blocked gate needs an explicit exception reason. Signing freezes these counts and the current build context.</p></div>{!live.data.gate.ready && <div className="space-y-1"><Label htmlFor="qa-exception">Exception reason</Label><Textarea id="qa-exception" value={exceptionReason} onChange={event => setExceptionReason(event.target.value)} maxLength={4000} rows={3} /></div>}{signoffError && <p role="alert" className="text-sm text-destructive">{signoffError}</p>}<Button onClick={saveSnapshot} disabled={signoff.isPending}>Sign snapshot</Button></div>}
      <div className="space-y-3 print:hidden"><h2 className="text-sm font-semibold">Previous snapshots</h2><div className="divide-y rounded-xl border bg-card">{snapshots.data?.data.map(item => <button key={item._id} type="button" className="flex w-full items-center justify-between p-4 text-left text-sm hover:bg-muted/30" onClick={() => setSnapshot(item)}><span>{new Date(item.signedAt).toLocaleString()}</span><span className="text-xs text-muted-foreground">{item.report.gate.ready ? 'Gate clear' : 'Exception recorded'}</span></button>)}{!snapshots.data?.data.length && <p className="p-4 text-sm text-muted-foreground">No signed snapshots yet.</p>}</div><div className="flex justify-end gap-2"><Button size="sm" variant="outline" disabled={snapshotPage <= 1} onClick={() => setSnapshotPage(snapshotPage - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={snapshotPage * 30 >= (snapshots.data?.pagination.total || 0)} onClick={() => setSnapshotPage(snapshotPage + 1)}>Next</Button></div></div>
    </>}
  </div>;
}
