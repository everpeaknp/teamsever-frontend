'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Claim = { _id: string; expenseDate: string; amount: string; currency: string; category: string; description: string; status: string; reviewNote?: string; payrollRun?: { periodStart: string; status: string } | null; receiptDocument?: { name: string } | null; history?: { action: string; at: string; actor?: { name?: string }; note?: string }[] };

export function MyReimbursementClaims({ workspaceId }: { workspaceId: string }) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [editingClaim, setEditingClaim] = useState<string | null>(null);
  const [amount, setAmount] = useState(''); const [currency, setCurrency] = useState('NPR'); const [category, setCategory] = useState('Travel'); const [description, setDescription] = useState(''); const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10)); const [receipt, setReceipt] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const load = async () => { try { const response = await api.get(`/workspaces/${workspaceId}/hr/my/reimbursements`); setClaims(response.data.data || []); } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load reimbursement claims'); } };
  useEffect(() => { void load(); }, [workspaceId]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      let receiptDocumentId: string | undefined;
      if (receipt) {
        const form = new FormData(); form.append('file', receipt); form.append('category', 'reimbursement_receipt');
        const uploaded = await api.post(`/workspaces/${workspaceId}/hr/my/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        receiptDocumentId = uploaded.data.data._id;
      }
      const payload = { amount, currency, category, description, expenseDate, receiptDocumentId };
      if (editingClaim) await api.patch(`/workspaces/${workspaceId}/hr/my/reimbursements/${editingClaim}`, payload);
      else await api.post(`/workspaces/${workspaceId}/hr/my/reimbursements`, payload);
      setAmount(''); setDescription(''); setReceipt(null); setEditingClaim(null); toast.success(editingClaim ? 'Claim updated and resubmitted' : 'Reimbursement claim submitted'); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not submit reimbursement claim'); }
    finally { setBusy(false); }
  };
  const editClaim = (claim: Claim) => { setEditingClaim(claim._id); setAmount(claim.amount); setCurrency(claim.currency); setCategory(claim.category); setDescription(claim.description); setExpenseDate(claim.expenseDate.slice(0, 10)); setReceipt(null); };
  return <Card><CardContent className="space-y-4 p-5">
    <div><h2 className="text-lg font-semibold">Reimbursement claims</h2><p className="text-sm text-muted-foreground">Submit work expenses for review. Receipt files are encrypted in your HR documents.</p></div>
    {editingClaim && <p className="text-sm text-amber-700">Editing a rejected claim for resubmission.</p>}
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="space-y-1 text-sm font-medium">Expense date<Input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Category<Input required maxLength={80} value={category} onChange={e => setCategory(e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Amount<Input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <label className="space-y-1 text-sm font-medium">Currency<Input maxLength={3} required value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} /></label>
      <label className="space-y-1 text-sm font-medium">Receipt (optional)<Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx" onChange={e => setReceipt(e.target.files?.[0] || null)} /></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2 lg:col-span-4">Expense details<Input required maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <div className="flex items-center gap-2 self-end"><Button disabled={busy}>{busy ? 'Submitting…' : editingClaim ? 'Resubmit claim' : 'Submit claim'}</Button>{editingClaim && <Button type="button" variant="outline" onClick={() => setEditingClaim(null)}>Cancel</Button>}</div>
    </form>
    {claims.length ? <ul className="divide-y rounded-lg border">{claims.map(claim => <li key={claim._id} className="flex flex-wrap items-start justify-between gap-3 p-3"><div><p className="font-medium">{claim.category} · {claim.currency} {claim.amount}</p><p className="text-sm text-muted-foreground">{new Date(claim.expenseDate).toLocaleDateString()} · {claim.description}</p><p className="text-xs capitalize text-muted-foreground">{claim.receiptDocument?.name ? `Receipt: ${claim.receiptDocument.name} · ` : ''}{claim.payrollRun ? `Included in payroll ${new Date(claim.payrollRun.periodStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })} · ` : ''}{claim.status.replaceAll('_', ' ')}{claim.reviewNote ? ` · ${claim.reviewNote}` : ''}</p>{claim.history?.length ? <p className="mt-1 text-xs text-muted-foreground">History: {claim.history.map(event => `${event.action.replaceAll('_', ' ')} · ${new Date(event.at).toLocaleString()}`).join(' → ')}</p> : null}</div><div className="flex items-center gap-2"><span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{claim.status.replaceAll('_', ' ')}</span>{claim.status === 'rejected' && <Button size="sm" variant="outline" onClick={() => editClaim(claim)}>Edit & resubmit</Button>}</div></li>)}</ul> : <p className="text-sm text-muted-foreground">No reimbursement claims submitted yet.</p>}
  </CardContent></Card>;
}
