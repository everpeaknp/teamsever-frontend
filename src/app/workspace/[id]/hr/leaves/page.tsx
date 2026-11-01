'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaveManagementTab } from '@/components/attendance/LeaveManagementTab';
import { toast } from 'sonner';

type Policy = { _id: string; code: string; name: string; paid: boolean; active: boolean; accrual: string; entitlementDays: number; yearStartMonth: number; weekendDays: number[]; prorateMidYearJoiners?: boolean; maxCarryOverDays?: number; carryOverExpiryMonths?: number };
type Balance = { policy: string; name: string; active: boolean; accrued: number | null; baseAccrued?: number | null; carriedOver?: number; isProrated?: boolean; used: number; pending: number; available: number | null; period: { from: string; to: string }; maxCarryOverDays?: number };
const initialForm = { code: '', name: '', paid: true, accrual: 'annual', entitlementDays: '', yearStartMonth: '1', weekendDays: [] as number[], excludeScheduleHolidays: true, allowNegativeBalance: false, prorateMidYearJoiners: true, maxCarryOverDays: '0', carryOverExpiryMonths: '0', reason: '' };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HrLeavesPage() {
  const workspaceId = useParams().id as string;
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [change, setChange] = useState<Policy | null>(null);
  const [changeReason, setChangeReason] = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [policyResult, balanceResult] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/leave-policies`),
        api.get(`/workspaces/${workspaceId}/hr/my/leave-balances`),
      ]);
      setPolicies(policyResult.data.data || []);
      setCanManage(policyResult.data.permissions?.canManage === true);
      setBalances(balanceResult.data.data || []);
    } catch (loadError: any) { setError(loadError?.response?.data?.message || 'Could not load leave policies and balances'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/leave-policies`, {
        ...form,
        entitlementDays: form.accrual === 'unlimited' ? 0 : Number(form.entitlementDays),
        yearStartMonth: Number(form.yearStartMonth),
        prorateMidYearJoiners: form.prorateMidYearJoiners,
        maxCarryOverDays: Number(form.maxCarryOverDays || 0),
        carryOverExpiryMonths: Number(form.carryOverExpiryMonths || 0),
      });
      toast.success('Leave policy created'); setForm(initialForm); setShowForm(false); await load();
    } catch (saveError: any) { toast.error(saveError?.response?.data?.message || 'Could not create leave policy'); }
    finally { setSaving(false); }
  };
  const setActive = async (event: React.FormEvent) => {
    event.preventDefault(); if (!change) return; setSaving(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/hr/leave-policies/${change._id}/active`, { active: !change.active, reason: changeReason.trim() });
      toast.success(change.active ? 'Policy deactivated for new requests' : 'Policy activated');
      setChange(null); setChangeReason(''); await load();
    } catch (saveError: any) { toast.error(saveError?.response?.data?.message || 'Could not change policy state'); }
    finally { setSaving(false); }
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><Link className="text-sm text-muted-foreground hover:text-foreground" href={`/workspace/${workspaceId}/hr`}>Human Resources</Link><h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-tight"><CalendarDays className="h-7 w-7 text-primary" />Leave & balances</h1><p className="mt-2 text-sm text-muted-foreground">Your entitlements, requests, automatic carryovers and approval history</p></div>{canManage && <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Close policy form' : 'Create leave policy'}</Button>}</header>
    {loading ? <p className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading leave information</p> : error ? <Card><CardContent className="space-y-3 py-6"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={load}>Retry</Button></CardContent></Card> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="My leave balances">{balances.length ? balances.map((balance) => <Card key={balance.policy}><CardHeader className="pb-2"><CardTitle className="text-lg flex items-center justify-between">{balance.name}{!balance.active && <span className="ml-2 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">Inactive</span>}</CardTitle></CardHeader><CardContent className="space-y-1"><div className="flex items-baseline gap-2"><p className="text-3xl font-semibold">{balance.available ?? 'Unlimited'}</p><span className="text-sm font-normal text-muted-foreground">{balance.available !== null ? 'days available' : ''}</span></div><p className="mt-2 text-sm text-muted-foreground">{balance.accrued === null ? 'Unlimited entitlement' : `${balance.accrued} accrued`} · {balance.used} used · {balance.pending} pending</p>{((balance.carriedOver || 0) > 0 || balance.isProrated) && <div className="flex flex-wrap gap-1.5 pt-1">{(balance.carriedOver || 0) > 0 && <span className="text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">+{balance.carriedOver}d carried over</span>}{balance.isProrated && <span className="text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Mid-year prorated</span>}</div>}<p className="mt-1 text-xs text-muted-foreground">{balance.period.from} to {balance.period.to}</p></CardContent></Card>) : <Card className="sm:col-span-2"><CardContent className="py-6 text-sm text-muted-foreground">No configured leave balance is available. HR must create your employee record and an applicable leave policy. Existing requests remain available below.</CardContent></Card>}</section>
      {canManage && <Card><CardHeader><CardTitle>Leave policies</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Set your organization’s approved rules. Annual allowance is granted per leave year with mid-year joiner fractional proration. Unused days automatically carry over according to statutory rules (Nepal Labour Act up to 90 days home / 45 days sick). Monthly accruals are granted at the start of each month.</p>{!policies.length ? <p className="text-sm text-muted-foreground">No policies configured.</p> : policies.map((policy) => <div key={policy._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{policy.name} <span className="text-xs text-muted-foreground">{policy.code} · {policy.active ? 'Active' : 'Inactive'}</span></p><p className="mt-1 text-sm text-muted-foreground">{policy.paid ? 'Paid' : 'Unpaid'} · {policy.accrual === 'unlimited' ? 'Unlimited days' : `${policy.entitlementDays} days / ${policy.accrual === 'monthly' ? 'month' : 'year'}`} · Non-working days: {policy.weekendDays.map((day) => weekdays[day]).join(', ') || 'None excluded'}</p><div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>Prorate mid-year: {policy.prorateMidYearJoiners !== false ? 'Enabled' : 'Disabled'}</span><span>·</span><span>Carryover: {(policy.maxCarryOverDays || 0) > 0 ? `Up to ${policy.maxCarryOverDays}d${(policy.carryOverExpiryMonths || 0) > 0 ? ` (expires in ${policy.carryOverExpiryMonths} mo)` : ''}` : 'No carryover'}</span></div></div><Button size="sm" variant="outline" onClick={() => { setChange(policy); setChangeReason(''); }}>{policy.active ? 'Deactivate' : 'Activate'}</Button></div>)}
        {change && <form onSubmit={setActive} className="space-y-3 rounded-lg border p-4"><p className="text-sm font-medium">{change.active ? 'Deactivate' : 'Activate'} {change.name}</p><Input aria-label="Policy status change reason" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} required minLength={3} maxLength={500} placeholder="Reason for this change" /><div className="flex gap-2"><Button type="submit" disabled={saving}>Save status</Button><Button variant="outline" type="button" onClick={() => setChange(null)}>Cancel</Button></div></form>}
      </CardContent></Card>}
      {showForm && canManage && <Card><CardHeader><CardTitle>Create leave policy</CardTitle></CardHeader><CardContent><form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Policy code<Input required maxLength={30} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium">Name<Input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium">Entitlement<select className="h-10 w-full rounded-md border bg-background px-3" value={form.accrual} onChange={(event) => setForm({ ...form, accrual: event.target.value })}><option value="annual">Annual allowance</option><option value="monthly">Monthly accrual</option><option value="unlimited">Unlimited</option></select></label>
        {form.accrual !== 'unlimited' && <label className="space-y-1 text-sm font-medium">Days per {form.accrual === 'monthly' ? 'month' : 'leave year'}<Input required type="number" min="0" max="366" step="0.01" value={form.entitlementDays} onChange={(event) => setForm({ ...form, entitlementDays: event.target.value })} /></label>}
        <label className="space-y-1 text-sm font-medium">Leave year starts<select className="h-10 w-full rounded-md border bg-background px-3" value={form.yearStartMonth} onChange={(event) => setForm({ ...form, yearStartMonth: event.target.value })}>{Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{new Date(2026, month, 1).toLocaleString(undefined, { month: 'long' })}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <label className="space-y-1 text-sm font-medium">Max carryover days to next year<Input type="number" min="0" max="90" value={form.maxCarryOverDays} onChange={(event) => setForm({ ...form, maxCarryOverDays: event.target.value })} placeholder="0 (no carryover)" /></label>
          <label className="space-y-1 text-sm font-medium">Carryover expiry (months)<Input type="number" min="0" max="12" value={form.carryOverExpiryMonths} onChange={(event) => setForm({ ...form, carryOverExpiryMonths: event.target.value })} placeholder="0 (valid all year)" /></label>
        </div>
        <fieldset className="space-y-2 sm:col-span-2"><legend className="text-sm font-medium">Non-working weekdays excluded from leave charges</legend><div className="flex flex-wrap gap-4">{weekdays.map((day, index) => <label className="flex items-center gap-2 text-sm" key={day}><input type="checkbox" checked={form.weekendDays.includes(index)} onChange={(event) => setForm({ ...form, weekendDays: event.target.checked ? [...form.weekendDays, index] : form.weekendDays.filter((value) => value !== index) })} />{day}</label>)}</div></fieldset>
        <div className="flex flex-col gap-3 sm:col-span-2">{(['paid', 'excludeScheduleHolidays', 'allowNegativeBalance', 'prorateMidYearJoiners'] as const).map((field) => <label key={field} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.checked })} />{{ paid: 'Paid leave', excludeScheduleHolidays: 'Exclude holidays from assigned work schedules', allowNegativeBalance: 'Allow requests exceeding accrued balance', prorateMidYearJoiners: 'Prorate annual entitlement for mid-year joiners based on start date' }[field]}</label>)}</div>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Policy approval reason<Input required minLength={3} maxLength={500} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
        <div className="sm:col-span-2"><Button disabled={saving} type="submit">{saving ? 'Creating…' : 'Create policy'}</Button></div>
      </form></CardContent></Card>}
      <LeaveManagementTab workspaceId={workspaceId} />
      <p className="text-sm text-muted-foreground">Apply for leave from your manager’s chat using “Request time away”. Your configured leave type and balance are checked by the server.</p>
      <Button asChild variant="outline"><Link href={`/workspace/${workspaceId}/chat`}>Open chats</Link></Button>
    </>}
  </main>;
}
