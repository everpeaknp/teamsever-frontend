'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type PayrollAdjustment = { _id: string; category: string; name: string; amount: string; reason: string; reimbursementClaim?: string | null; addedBy?: string; createdAt: string };
type Line = { employee: string; employeeNumber: string; employeeName: string; salaryType: string; baseAmount: string; earnings: string; deductions: string; employerContributions: string; netAmount: string; recordedHours: number; approvedLeaveDays: number; warnings: string[]; components: Array<{ code: string; name: string; kind: string; amount: string }>; manualAdjustments?: PayrollAdjustment[] };
type Run = { _id: string; periodStart: string; periodEnd: string; currency: string; status: string; revision: number; lines: Line[]; history?: Array<{ action: string; fromStatus?: string; toStatus: string; actor?: { name?: string }; note?: string; occurredAt: string }>; totals: { baseAmount: string; earnings: string; deductions: string; employerContributions: string; netAmount: string; employeeCount: number }; submittedBy?: { name?: string }; approvedBy?: { name?: string }; approvedAt?: string; approvalNote?: string; rejectionReason?: string; voidReason?: string; paidAt?: string; paymentReference?: string };

export default function PayrollRunPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const payrollRunId = params.payrollRunId as string;
  const [run, setRun] = useState<Run | null>(null);
  const [access, setAccess] = useState({ canManage: false, canApprove: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Line | null>(null);
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<Record<string, { category: string; name: string; amount: string; reason: string }>>({});

  const load = async () => {
    setLoading(true);
    try { const response = await api.get(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}`); setRun(response.data.data); setAccess(response.data.permissions || { canManage: false, canApprove: false }); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load payroll run'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId, payrollRunId]);

  const transition = async (action: 'submit' | 'approve' | 'reject' | 'void') => {
    const rejectionReason = action === 'reject' ? window.prompt('Reason for rejecting this payroll run?') || '' : '';
    const reason = action === 'void' ? window.prompt('Reason for voiding this payroll run?') || '' : '';
    const body = action === 'reject' ? { rejectionReason } : action === 'void' ? { reason } : action === 'approve' ? { approvalNote: window.prompt('Approval note (optional):') || '' } : {};
    if (['reject', 'void'].includes(action) && !String(rejectionReason || reason).trim()) return;
    setBusy(true);
    try { await api.patch(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/${action}`, body); toast.success(`Payroll run ${action === 'submit' ? 'submitted' : `${action}d`}`); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || `Could not ${action} payroll run`); }
    finally { setBusy(false); }
  };

  const download = async () => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = `payroll-${run?.periodStart.slice(0, 7)}-${run?.currency}.csv`; link.click(); URL.revokeObjectURL(url);
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not export payroll'); }
  };

  const downloadBankExport = async (format: 'generic' | 'connectips' | 'ssf_schedule') => {
    try {
      const response = await api.get(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/bank-export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${format}-${run?.periodStart.slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${format === 'connectips' ? 'ConnectIPS' : format === 'ssf_schedule' ? 'SSF Schedule' : 'Bank Disbursal'} file`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not export bank disbursal file');
    }
  };

  const markPaid = async () => {
    const paymentReference = window.prompt('Enter the bank, cash, or payment reference:') || '';
    if (!paymentReference.trim()) return;
    setBusy(true);
    try { await api.patch(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/paid`, { paymentReference }); toast.success('Payroll marked as paid'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not mark payroll paid'); }
    finally { setBusy(false); }
  };

  const includeReimbursements = async () => {
    setBusy(true);
    try { const response = await api.post(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/reimbursements/include`); setRun(response.data.data.run); toast.success(`${response.data.data.includedCount} approved reimbursement claim(s) included`); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not include approved reimbursements'); }
    finally { setBusy(false); }
  };
  const addAdjustment = async (line: Line, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = adjustmentDrafts[line.employee] || { category: 'overtime', name: '', amount: '', reason: '' };
    setBusy(true);
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/lines/${line.employee}/adjustments`, { action: 'add', ...draft });
      setRun(response.data.data);
      setAdjustmentDrafts(current => ({ ...current, [line.employee]: { category: 'overtime', name: '', amount: '', reason: '' } }));
      toast.success('Payroll adjustment added to draft');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not add payroll adjustment'); }
    finally { setBusy(false); }
  };

  const removeAdjustment = async (line: Line, adjustment: PayrollAdjustment) => {
    const reason = window.prompt(`Why are you removing “${adjustment.name}”?`) || '';
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const response = await api.patch(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/lines/${line.employee}/adjustments`, { action: 'remove', adjustmentId: adjustment._id, reason });
      setRun(response.data.data);
      toast.success('Payroll adjustment removed');
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not remove payroll adjustment'); }
    finally { setBusy(false); }
  };

  const viewPayslip = async (employeeId: string) => {
    try { const response = await api.get(`/workspaces/${workspaceId}/hr/payroll-runs/${payrollRunId}/payslips/${employeeId}`); setSelectedPayslip(response.data.data.line); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load payslip'); }
  };

  if (loading) return <main className="container mx-auto flex justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading payroll run</main>;
  if (!run) return <main className="container mx-auto px-4 py-8"><p>Payroll run unavailable.</p></main>;
  const periodLabel = `${new Date(run.periodStart).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${new Date(run.periodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}`;

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <Link href={`/workspace/${workspaceId}/hr/payroll`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Payroll history</Link>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{periodLabel} payroll{run.revision > 1 ? ` · Revision ${run.revision}` : ''}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{run.totals.employeeCount} employees · {run.currency} {run.totals.netAmount} net total · <span className="capitalize">{run.status.replace('_', ' ')}</span></p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {run.status === 'draft' && access.canManage && <Button variant="outline" onClick={() => void includeReimbursements()} disabled={busy}>Include approved claims</Button>}
        {run.status === 'draft' && access.canManage && <Button onClick={() => void transition('submit')} disabled={busy}><Send className="mr-2 h-4 w-4" />Submit for approval</Button>}
        {run.status === 'pending_approval' && access.canApprove && (
          <>
            <Button onClick={() => void transition('approve')} disabled={busy}>Approve payroll</Button>
            <Button variant="outline" onClick={() => void transition('reject')} disabled={busy}>Reject</Button>
          </>
        )}
        {run.status === 'approved' && access.canManage && <Button onClick={() => void markPaid()} disabled={busy}>Mark as paid</Button>}
        {['approved', 'paid'].includes(run.status) && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 p-1">
            <Button type="button" size="sm" variant="outline" onClick={() => void download()}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Summary CSV
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void downloadBankExport('generic')}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Bank File
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void downloadBankExport('connectips')}>
              🇳🇵 ConnectIPS
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void downloadBankExport('ssf_schedule')}>
              🇳🇵 SSF Schedule
            </Button>
          </div>
        )}
        {access.canManage && ['draft', 'pending_approval', 'approved', 'rejected'].includes(run.status) && <Button variant="outline" onClick={() => void transition('void')} disabled={busy}>Void run</Button>}
      </div>
    </header>
    <Card><CardHeader><CardTitle>Run totals</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Base pay', run.totals.baseAmount], ['Earnings', run.totals.earnings], ['Deductions', run.totals.deductions], ['Employer contributions', run.totals.employerContributions], ['Net pay', run.totals.netAmount]].map(([label, amount]) => <div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{run.currency} {amount}</p></div>)}</CardContent></Card>
    {run.status === 'draft' && access.canManage && <p className="text-sm text-muted-foreground">Period-specific overtime, bonuses, reimbursements, deductions, and employer contributions can be entered per employee below. These are manual amounts; apply your approved payroll policy before submitting the run.</p>}
    <Card><CardHeader><CardTitle>Payroll audit history</CardTitle></CardHeader><CardContent>{run.history?.length ? <ol className="space-y-3">{[...run.history].reverse().map((event, index) => <li key={`${event.occurredAt}-${index}`} className="border-l-2 pl-3"><p className="font-medium capitalize">{event.action.replace('_', ' ')}{event.fromStatus && ` · ${event.fromStatus.replace('_', ' ')} → ${event.toStatus.replace('_', ' ')}`}</p><p className="text-sm text-muted-foreground">{event.actor?.name || 'Workspace member'} · {new Date(event.occurredAt).toLocaleString()}</p>{event.note && <p className="mt-1 whitespace-pre-wrap text-sm">{event.note}</p>}</li>)}</ol> : <p className="text-sm text-muted-foreground">No status history is available for this run.</p>}</CardContent></Card>
    {run.approvedBy && <p className="text-sm text-muted-foreground">Approved by {run.approvedBy.name || 'workspace approver'}{run.approvedAt ? ` on ${new Date(run.approvedAt).toLocaleString()}` : ''}{run.approvalNote ? ` · ${run.approvalNote}` : ''}</p>}{run.paidAt && <p className="text-sm text-emerald-700">Marked paid on {new Date(run.paidAt).toLocaleString()} · Reference: {run.paymentReference || '—'}</p>}{run.rejectionReason && <p className="text-sm text-rose-700">Rejected: {run.rejectionReason}</p>}{run.voidReason && <p className="text-sm text-muted-foreground">Voided: {run.voidReason}</p>}
    <section className="space-y-3" aria-label="Payroll lines"><h2 className="text-lg font-semibold">Employee payroll lines</h2>{run.lines.map((line) => <Card key={line.employee}><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{line.employeeName} · {line.employeeNumber}</p><p className="text-xs capitalize text-muted-foreground">{line.salaryType} basis · {line.recordedHours.toFixed(2)} attendance hours · {line.approvedLeaveDays} approved leave days</p></div><p className="font-semibold">Net {run.currency} {line.netAmount}</p></div><div className="grid gap-2 text-sm sm:grid-cols-4"><p>Base: {run.currency} {line.baseAmount}</p><p>Earnings: {run.currency} {line.earnings}</p><p>Deductions: {run.currency} {line.deductions}</p><p>Employer: {run.currency} {line.employerContributions}</p></div>{line.components.length > 0 && <ul className="flex flex-wrap gap-2">{line.components.map((component, index) => <li key={`${component.code}-${index}`} className="rounded-md bg-muted px-2 py-1 text-xs">{component.name}: {run.currency} {component.amount} ({component.kind.replace('_', ' ')})</li>)}</ul>}{(line.manualAdjustments || []).length > 0 && <ul className="space-y-2 border-t pt-3">{line.manualAdjustments!.map(adjustment => <li key={adjustment._id} className="flex flex-wrap items-start justify-between gap-2 text-sm"><span><span className="font-medium">{adjustment.name}</span> · {adjustment.category.replaceAll('_', ' ')} · {run.currency} {adjustment.amount}<span className="block text-xs text-muted-foreground">{adjustment.reason}</span></span>{run.status === 'draft' && access.canManage && !adjustment.reimbursementClaim && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void removeAdjustment(line, adjustment)}>Remove</Button>}</li>)}</ul>}{run.status === 'draft' && access.canManage && <form onSubmit={event => void addAdjustment(line, event)} className="grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-5"><select aria-label={`Adjustment type for ${line.employeeName}`} value={(adjustmentDrafts[line.employee]?.category || 'overtime')} onChange={event => setAdjustmentDrafts(current => ({ ...current, [line.employee]: { ...(current[line.employee] || { category: 'overtime', name: '', amount: '', reason: '' }), category: event.target.value } }))} className="h-10 rounded-md border bg-background px-3 text-sm">{[['overtime', 'Overtime'], ['bonus', 'Bonus'], ['reimbursement', 'Reimbursement'], ['other_earning', 'Other earning'], ['deduction', 'Deduction'], ['employer_contribution', 'Employer contribution']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input required aria-label="Adjustment name" placeholder="Name" value={adjustmentDrafts[line.employee]?.name || ''} onChange={event => setAdjustmentDrafts(current => ({ ...current, [line.employee]: { ...(current[line.employee] || { category: 'overtime', name: '', amount: '', reason: '' }), name: event.target.value } }))} /><Input required aria-label="Adjustment amount" type="number" min="0.01" max="1000000000" step="0.01" placeholder="Amount" value={adjustmentDrafts[line.employee]?.amount || ''} onChange={event => setAdjustmentDrafts(current => ({ ...current, [line.employee]: { ...(current[line.employee] || { category: 'overtime', name: '', amount: '', reason: '' }), amount: event.target.value } }))} /><Input required aria-label="Adjustment reason" placeholder="Reason" value={adjustmentDrafts[line.employee]?.reason || ''} onChange={event => setAdjustmentDrafts(current => ({ ...current, [line.employee]: { ...(current[line.employee] || { category: 'overtime', name: '', amount: '', reason: '' }), reason: event.target.value } }))} /><Button type="submit" variant="outline" disabled={busy}>Add adjustment</Button></form>}{line.warnings.map((warning, index) => <p key={index} className="text-sm text-amber-700">{warning}</p>)}</CardContent></Card>)}</section>
    {['approved', 'paid'].includes(run.status) && <Card><CardHeader><CardTitle>Payslips</CardTitle></CardHeader><CardContent><ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{run.lines.map((line) => <li key={line.employee}><Button type="button" variant="outline" className="flex h-auto w-full justify-between py-3 text-sm" onClick={() => void viewPayslip(line.employee)}><span>{line.employeeName}</span><span className="font-medium">{run.currency} {line.netAmount}</span></Button></li>)}</ul></CardContent></Card>}
    {selectedPayslip && <Card className="print:border-0 print:shadow-none"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Payslip · {periodLabel}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{selectedPayslip.employeeName} · {selectedPayslip.employeeNumber}</p></div><Button type="button" variant="outline" onClick={() => window.print()}>Print</Button></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><p>Attendance hours <span className="float-right font-medium">{selectedPayslip.recordedHours.toFixed(2)}</span></p><p>Approved leave days · review <span className="float-right font-medium">{selectedPayslip.approvedLeaveDays}</span></p><p>Base pay <span className="float-right font-medium">{run.currency} {selectedPayslip.baseAmount}</span></p><p>Earnings <span className="float-right font-medium">{run.currency} {selectedPayslip.earnings}</span></p><p>Deductions <span className="float-right font-medium">{run.currency} {selectedPayslip.deductions}</span></p><p>Employer contributions <span className="float-right font-medium">{run.currency} {selectedPayslip.employerContributions}</span></p><p className="border-t pt-3 font-semibold sm:col-span-2">Net pay <span className="float-right">{run.currency} {selectedPayslip.netAmount}</span></p>{selectedPayslip.components.map((component, index) => <p key={index} className="text-muted-foreground">{component.name} <span className="float-right">{run.currency} {component.amount}</span></p>)}{selectedPayslip.manualAdjustments?.map(adjustment => <p key={adjustment._id} className="text-muted-foreground">{adjustment.name} · {adjustment.category.replaceAll('_', ' ')} <span className="float-right">{run.currency} {adjustment.amount}</span><span className="block text-xs">{adjustment.reason}</span></p>)}</CardContent></Card>}
  </main>;
}
