'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, Download, Loader2, Save, Trash2, Upload, UserRound } from 'lucide-react';
import { api } from '@/lib/axios';
import { loadAllHrEmployees } from '@/lib/hrEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

type EmergencyContact = { name: string; relationship?: string; phone: string };
type GovernmentId = { type: string; value?: string; lastFour?: string; expiresAt?: string };
type Employee = { _id: string; employeeNumber: string; employmentType: string; employmentStatus: string; jobTitle?: string; department?: string; location?: string; startDate: string; probationEndDate?: string; endDate?: string; reportsTo?: { _id: string; name: string; email: string } | null; user: { _id: string; name: string; email: string }; membership?: { role: string; status: string; customRoleTitle?: string; isOwner: boolean } | null; phone?: string; address?: string; emergencyContacts?: EmergencyContact[]; governmentIds?: GovernmentId[] };
type Action = { _id: string; actionType: string; effectiveDate: string; reason?: string; summary?: string; changedFields: string[]; changes?: Array<{ field: string; before?: string; after?: string }>; actor?: { name: string } };
type Access = { canManageRecords: boolean; canViewSensitive: boolean; canManageSensitive: boolean };
type Compensation = { _id: string; salaryType: string; salaryAmount: string; currency: string; components: Array<{ code: string; name: string; kind: string; amount: string; recurring: boolean }>; effectiveFrom: string; effectiveTo?: string; reason: string; status: 'pending' | 'approved' | 'rejected'; requestedBy?: { name?: string }; approvedBy?: { name?: string }; approvedAt?: string; approvalNote?: string };
type HrDocument = { _id: string; name: string; mimeType: string; size: number; category: string; expiresAt?: string; createdAt: string; uploadedBy?: { name?: string } };
type OnboardingChecklist = { _id: string; employee: string | { _id: string }; items: { _id: string; title: string; category: string; status: string }[] };
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function EmployeeProfilePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const employeeId = params.employeeId as string;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [access, setAccess] = useState<Access & { canViewCompensation: boolean; canManageCompensation: boolean; canApproveCompensation: boolean }>({ canManageRecords: false, canViewSensitive: false, canManageSensitive: false, canViewCompensation: false, canManageCompensation: false, canApproveCompensation: false });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [compensation, setCompensation] = useState<Compensation[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [documentCategory, setDocumentCategory] = useState('employment');
  const [documentExpiresAt, setDocumentExpiresAt] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [onboardingCases, setOnboardingCases] = useState<OnboardingChecklist[]>([]);
  const [selectedOnboarding, setSelectedOnboarding] = useState('');
  const [selectedChecklistItem, setSelectedChecklistItem] = useState('');
  const [compForm, setCompForm] = useState({ salaryType: 'monthly', salaryAmount: '', currency: 'NPR', effectiveFrom: localDateValue(), reason: '', components: [] as Array<{ code: string; name: string; kind: string; amount: string; recurring: boolean }> });
  const [form, setForm] = useState({ employeeNumber: '', employmentType: '', employmentStatus: '', jobTitle: '', department: '', location: '', startDate: '', probationEndDate: '', endDate: '', reportsTo: '', effectiveDate: localDateValue(), actionType: 'profile_update', reason: '', summary: '' });
  const [sensitiveForm, setSensitiveForm] = useState<{ phone: string; address: string; emergencyContacts: EmergencyContact[]; governmentIds: GovernmentId[] }>({ phone: '', address: '', emergencyContacts: [], governmentIds: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const profile = await api.get(`/workspaces/${workspaceId}/hr/employees/${employeeId}`);
      const profileAccess = profile.data.permissions || {};
      const [history, directory, compensationResult] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/employees/${employeeId}/actions`),
        loadAllHrEmployees<Employee>(workspaceId),
        profileAccess.canViewCompensation ? api.get(`/workspaces/${workspaceId}/hr/employees/${employeeId}/compensation`) : Promise.resolve({ data: { data: [] } }),
      ]);
      const [documentResult, onboardingResult] = profileAccess.canViewSensitive ? await Promise.all([api.get(`/workspaces/${workspaceId}/hr/employees/${employeeId}/documents`), api.get(`/workspaces/${workspaceId}/hr/onboarding`).catch(() => ({ data: { data: [] } }))]) : [{ data: { data: [] } }, { data: { data: [] } }];
      const data = profile.data.data as Employee;
      setAccess({ canManageRecords: false, canViewSensitive: false, canManageSensitive: false, canViewCompensation: false, canManageCompensation: false, canApproveCompensation: false, ...profileAccess });
      setEmployee(data);
      setForm((previous) => ({ ...previous, employeeNumber: data.employeeNumber || '', employmentType: data.employmentType || 'full_time', employmentStatus: data.employmentStatus || 'active', jobTitle: data.jobTitle || '', department: data.department || '', location: data.location || '', startDate: data.startDate?.slice(0, 10) || '', probationEndDate: data.probationEndDate?.slice(0, 10) || '', endDate: data.endDate?.slice(0, 10) || '', reportsTo: data.reportsTo?._id || '' }));
      setSensitiveForm({ phone: data.phone || '', address: data.address || '', emergencyContacts: data.emergencyContacts || [], governmentIds: data.governmentIds || [] });
      setEmployees(directory);
      setCompensation(compensationResult.data.data || []);
      setActions(history.data.data || []);
      setDocuments(documentResult.data.data || []);
      setOnboardingCases((onboardingResult.data.data || []).filter((item: OnboardingChecklist) => String(typeof item.employee === 'string' ? item.employee : item.employee?._id) === employeeId));
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load employee record'); }
    finally { setLoading(false); }
  };

  const saveSensitive = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await api.patch(`/workspaces/${workspaceId}/hr/employees/${employeeId}/sensitive`, sensitiveForm); toast.success('Sensitive details updated'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update sensitive details'); }
    finally { setSaving(false); }
  };

  const requestCompensation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/employees/${employeeId}/compensation`, compForm);
      toast.success('Compensation change sent for approval');
      setCompForm({ salaryType: 'monthly', salaryAmount: '', currency: 'NPR', effectiveFrom: localDateValue(), reason: '', components: [] });
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not request compensation change'); }
    finally { setSaving(false); }
  };

  const reviewCompensation = async (record: Compensation, decision: 'approve' | 'reject') => {
    const approvalNote = decision === 'reject' ? window.prompt('Reason for rejecting this compensation change?') : window.prompt('Approval note (optional):') || '';
    if (decision === 'reject' && !approvalNote?.trim()) return;
    try {
      await api.patch(`/workspaces/${workspaceId}/hr/employees/${employeeId}/compensation/${record._id}/${decision}`, { approvalNote });
      toast.success(decision === 'approve' ? 'Compensation change approved' : 'Compensation change rejected');
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || `Could not ${decision} compensation change`); }
  };

  const uploadDocument = async (event: React.FormEvent) => {
    event.preventDefault(); if (!documentFile) { toast.error('Choose a document first'); return; }
    setUploadingDocument(true);
    try { const body = new FormData(); body.append('file', documentFile); body.append('category', documentCategory); if (documentExpiresAt) body.append('expiresAt', documentExpiresAt); if (selectedOnboarding) body.append('onboardingId', selectedOnboarding); if (selectedChecklistItem) body.append('checklistItemId', selectedChecklistItem); await api.post(`/workspaces/${workspaceId}/hr/employees/${employeeId}/documents`, body, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Confidential document encrypted and uploaded'); setDocumentFile(null); setDocumentExpiresAt(''); setSelectedChecklistItem(''); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not upload HR document'); }
    finally { setUploadingDocument(false); }
  };

  const downloadDocument = async (document: HrDocument) => {
    try { const response = await api.get(`/workspaces/${workspaceId}/hr/documents/${document._id}/download`, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; anchor.click(); URL.revokeObjectURL(url); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not download HR document'); }
  };

  const deleteDocument = async (document: HrDocument) => {
    if (!window.confirm(`Permanently delete ${document.name}?`)) return;
    try { await api.delete(`/workspaces/${workspaceId}/hr/documents/${document._id}`); setDocuments((current) => current.filter((item) => item._id !== document._id)); toast.success('HR document deleted'); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not delete HR document'); }
  };

  useEffect(() => { void load(); }, [workspaceId, employeeId]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await api.patch(`/workspaces/${workspaceId}/hr/employees/${employeeId}`, form); toast.success('Employee record updated'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update employee record'); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="container mx-auto flex justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading employee record</main>;
  if (!employee) return <main className="container mx-auto space-y-4 px-4 py-8"><p>Employee record unavailable.</p><Link className="text-primary" href={`/workspace/${workspaceId}/hr`}>Back to HR</Link></main>;

  const formatActionValue = (field: string, value?: string) => {
    if (!value || value === 'Not set') return value || 'Not set';
    if (field === 'reportsTo') return employees.find((item) => item.user?._id === value)?.user?.name || value;
    return value;
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={`/workspace/${workspaceId}/hr/people`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Employee directory</Link>
      {employee.user?._id && (
        <Link href={`/workspace/${workspaceId}/analytics/team-performance/${employee.user._id}`} className="text-sm font-medium text-primary hover:underline">
          Task &amp; performance scorecard →
        </Link>
      )}
    </div>
    <header className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><UserRound className="h-7 w-7" /></span><div><h1 className="text-3xl font-bold tracking-tight">{employee.user?.name || 'Employee'}</h1><p className="mt-1 text-muted-foreground">{employee.user?.email} · {employee.employeeNumber}</p></div></header>

    <Card><CardHeader><CardTitle>Employment record</CardTitle></CardHeader><CardContent>{access.canManageRecords ? <form onSubmit={save} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1 text-sm font-medium">Employee number<Input required value={form.employeeNumber} onChange={(event) => setForm({ ...form, employeeNumber: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Job title<Input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Department<Input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Location<Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Employment type<select value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{['full_time', 'part_time', 'contract', 'intern', 'temporary'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Employment status<select value={form.employmentStatus} onChange={(event) => setForm({ ...form, employmentStatus: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{['active', 'probation', 'on_leave', 'suspended', 'terminated', 'resigned'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Start date<Input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Probation end date<Input type="date" value={form.probationEndDate} onChange={(event) => setForm({ ...form, probationEndDate: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">End date<Input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Reports to<select value={form.reportsTo} onChange={(event) => setForm({ ...form, reportsTo: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="">No manager</option>{employees.filter((item) => item.user?._id !== employee.user?._id).map((item) => <option key={item._id} value={item.user._id}>{item.user.name} · {item.employeeNumber}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">HR action type<select value={form.actionType} onChange={(event) => setForm({ ...form, actionType: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{['profile_update', 'transfer', 'promotion', 'status_change', 'other'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Change effective date<Input type="date" value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2">Reason for this HR change<Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
      <div className="sm:col-span-2 lg:col-span-3"><Button disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save employment record</Button></div>
    </form> : <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><p><span className="text-muted-foreground">Employee number</span><br />{employee.employeeNumber}</p><p><span className="text-muted-foreground">Job title</span><br />{employee.jobTitle || 'Not set'}</p><p><span className="text-muted-foreground">Department</span><br />{employee.department || 'Not set'}</p><p><span className="text-muted-foreground">Location</span><br />{employee.location || 'Not set'}</p><p><span className="text-muted-foreground">Employment type</span><br />{employee.employmentType.replaceAll('_', ' ')}</p><p><span className="text-muted-foreground">Start date</span><br />{new Date(employee.startDate).toLocaleDateString()}</p><p><span className="text-muted-foreground">Probation end</span><br />{employee.probationEndDate ? new Date(employee.probationEndDate).toLocaleDateString() : 'Not set'}</p><p><span className="text-muted-foreground">End date</span><br />{employee.endDate ? new Date(employee.endDate).toLocaleDateString() : 'Not set'}</p><p className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">You can view this employee record, but your HR role does not allow editing it.</p></div>}</CardContent></Card>

    <Card><CardHeader><CardTitle>Workspace organization & access</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Reports to</span><p className="mt-1 font-medium">{employee.reportsTo?.name || 'No manager assigned'}</p></div><div><span className="text-muted-foreground">Workspace role</span><p className="mt-1 font-medium capitalize">{employee.membership?.customRoleTitle || employee.membership?.role || 'No current membership'}</p></div><div><span className="text-muted-foreground">Membership access status</span><p className="mt-1 font-medium capitalize">{employee.membership?.status || 'Not a member'}</p></div><div><span className="text-muted-foreground">Employment status</span><p className="mt-1 font-medium capitalize">{employee.employmentStatus.replace('_', ' ')}</p></div><p className="text-xs text-muted-foreground sm:col-span-2">Workspace role and access are read from the existing membership record. Employment status is tracked separately.</p></CardContent></Card>

    {access.canViewCompensation && <Card><CardHeader><CardTitle>Compensation & salary history</CardTitle></CardHeader><CardContent className="space-y-5">
      {access.canManageCompensation && <form onSubmit={requestCompensation} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <h3 className="font-semibold sm:col-span-2 lg:col-span-3">Request a compensation change</h3>
        <label className="space-y-1 text-sm font-medium">Pay basis<select value={compForm.salaryType} onChange={(event) => setCompForm({ ...compForm, salaryType: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{['monthly', 'weekly', 'daily', 'hourly'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="space-y-1 text-sm font-medium">Base rate<Input required type="number" min="0" step="0.01" value={compForm.salaryAmount} onChange={(event) => setCompForm({ ...compForm, salaryAmount: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium">Currency<Input required maxLength={3} value={compForm.currency} onChange={(event) => setCompForm({ ...compForm, currency: event.target.value.toUpperCase() })} /></label>
        <label className="space-y-1 text-sm font-medium">Effective from<Input required type="date" value={compForm.effectiveFrom} onChange={(event) => setCompForm({ ...compForm, effectiveFrom: event.target.value })} /></label>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Reason<Input required value={compForm.reason} onChange={(event) => setCompForm({ ...compForm, reason: event.target.value })} /></label>
        <div className="space-y-2 sm:col-span-2 lg:col-span-3"><div className="flex items-center justify-between"><h4 className="text-sm font-medium">Allowances, deductions & employer contributions</h4><Button type="button" size="sm" variant="outline" onClick={() => setCompForm({ ...compForm, components: [...compForm.components, { code: '', name: '', kind: 'earning', amount: '', recurring: true }] })}>Add component</Button></div>{compForm.components.map((component, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-5"><Input aria-label="Component code" placeholder="Code" value={component.code} onChange={(event) => setCompForm({ ...compForm, components: compForm.components.map((item, itemIndex) => itemIndex === index ? { ...item, code: event.target.value } : item) })} /><Input aria-label="Component name" placeholder="Name" value={component.name} onChange={(event) => setCompForm({ ...compForm, components: compForm.components.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} /><select aria-label="Component category" value={component.kind} onChange={(event) => setCompForm({ ...compForm, components: compForm.components.map((item, itemIndex) => itemIndex === index ? { ...item, kind: event.target.value } : item) })} className="h-10 rounded-md border bg-background px-3">{['earning', 'deduction', 'employer_contribution'].map((kind) => <option key={kind} value={kind}>{kind.replace('_', ' ')}</option>)}</select><Input aria-label="Component amount" type="number" min="0" step="0.01" placeholder="Amount" value={component.amount} onChange={(event) => setCompForm({ ...compForm, components: compForm.components.map((item, itemIndex) => itemIndex === index ? { ...item, amount: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setCompForm({ ...compForm, components: compForm.components.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button></div>)}</div>
        <Button className="sm:col-span-2 lg:col-span-3" disabled={saving}>Submit for approval</Button>
      </form>}
      {compensation.length ? <ol className="space-y-3">{compensation.map((item) => <li key={item._id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{item.currency} {item.salaryAmount} / {item.salaryType}</p><p className="text-sm text-muted-foreground">Effective {new Date(item.effectiveFrom).toLocaleDateString()}{item.effectiveTo ? ` to ${new Date(item.effectiveTo).toLocaleDateString()}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : item.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{item.status}</span></div><p className="mt-2 text-sm">{item.reason}</p>{item.components.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{item.components.map((component, index) => <li key={`${component.code}-${index}`} className="rounded-md bg-muted px-2 py-1 text-xs">{component.name}: {item.currency} {component.amount} · {component.kind.replace('_', ' ')}</li>)}</ul>}{item.approvalNote && <p className="mt-2 text-sm text-muted-foreground">Approval note: {item.approvalNote}</p>}{item.status === 'pending' && access.canApproveCompensation && <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void reviewCompensation(item, 'approve')}>Approve</Button><Button size="sm" variant="outline" onClick={() => void reviewCompensation(item, 'reject')}>Reject</Button></div>}</li>)}</ol> : <p className="text-sm text-muted-foreground">No compensation history recorded yet.</p>}
    </CardContent></Card>}

    {access.canViewSensitive && <Card><CardHeader><CardTitle>Private employee details</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">{access.canManageSensitive && <form onSubmit={saveSensitive} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 font-medium">Phone<Input value={sensitiveForm.phone} onChange={(event) => setSensitiveForm({ ...sensitiveForm, phone: event.target.value })} /></label><label className="space-y-1 font-medium">Address<Input value={sensitiveForm.address} onChange={(event) => setSensitiveForm({ ...sensitiveForm, address: event.target.value })} /></label></div><div className="space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">Emergency contacts</h3><Button type="button" size="sm" variant="outline" onClick={() => setSensitiveForm({ ...sensitiveForm, emergencyContacts: [...sensitiveForm.emergencyContacts, { name: '', relationship: '', phone: '' }] })}>Add contact</Button></div>{sensitiveForm.emergencyContacts.map((contact, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3"><Input aria-label="Contact name" placeholder="Name" value={contact.name} onChange={(event) => setSensitiveForm({ ...sensitiveForm, emergencyContacts: sensitiveForm.emergencyContacts.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} /><Input aria-label="Relationship" placeholder="Relationship" value={contact.relationship || ''} onChange={(event) => setSensitiveForm({ ...sensitiveForm, emergencyContacts: sensitiveForm.emergencyContacts.map((item, itemIndex) => itemIndex === index ? { ...item, relationship: event.target.value } : item) })} /><div className="flex gap-2"><Input aria-label="Contact phone" placeholder="Phone" value={contact.phone} onChange={(event) => setSensitiveForm({ ...sensitiveForm, emergencyContacts: sensitiveForm.emergencyContacts.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setSensitiveForm({ ...sensitiveForm, emergencyContacts: sensitiveForm.emergencyContacts.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button></div></div>)}</div><div className="space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">Government IDs</h3><Button type="button" size="sm" variant="outline" onClick={() => setSensitiveForm({ ...sensitiveForm, governmentIds: [...sensitiveForm.governmentIds, { type: '', value: '', lastFour: '', expiresAt: '' }] })}>Add ID</Button></div><p className="text-xs text-muted-foreground">Full ID values are encrypted before storage and shown only to users with sensitive-data access.</p>{sensitiveForm.governmentIds.map((id, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3"><Input aria-label="ID type" placeholder="ID type" value={id.type} onChange={(event) => setSensitiveForm({ ...sensitiveForm, governmentIds: sensitiveForm.governmentIds.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item) })} /><Input aria-label="Full government ID number" type="password" autoComplete="off" maxLength={160} placeholder="Full ID number (encrypted)" value={id.value || ''} onChange={(event) => setSensitiveForm({ ...sensitiveForm, governmentIds: sensitiveForm.governmentIds.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} /><div className="flex gap-2"><Input aria-label="ID expiry date" type="date" value={id.expiresAt || ''} onChange={(event) => setSensitiveForm({ ...sensitiveForm, governmentIds: sensitiveForm.governmentIds.map((item, itemIndex) => itemIndex === index ? { ...item, expiresAt: event.target.value } : item) })} /><Button type="button" variant="outline" onClick={() => setSensitiveForm({ ...sensitiveForm, governmentIds: sensitiveForm.governmentIds.filter((_, itemIndex) => itemIndex !== index) })}>Remove</Button></div></div>)}</div><Button size="sm" disabled={saving}>Save private details</Button></form>}{employee.phone && <p><span className="text-muted-foreground">Phone:</span> {employee.phone}</p>}{employee.address && <p><span className="text-muted-foreground">Address:</span> {employee.address}</p>}{employee.emergencyContacts?.map((contact, index) => <p key={index}><span className="text-muted-foreground">Emergency contact:</span> {contact.name}{contact.relationship ? ` (${contact.relationship})` : ''} · {contact.phone}</p>)}{employee.governmentIds?.map((id, index) => <p key={index}><span className="text-muted-foreground">ID:</span> {id.type}{id.lastFour ? ` · ending ${id.lastFour}` : ''}</p>)}</CardContent></Card>}

    {access.canViewSensitive && <Card><CardHeader><CardTitle>Encrypted HR documents</CardTitle></CardHeader><CardContent className="space-y-4">{access.canManageSensitive && <form onSubmit={uploadDocument} className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm font-medium">Document<Input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx" onChange={event => setDocumentFile(event.target.files?.[0] || null)} /></label><label className="space-y-1 text-sm font-medium">Category<select value={documentCategory} onChange={event => setDocumentCategory(event.target.value)} className="h-10 rounded-md border bg-background px-3">{['identity', 'employment', 'tax', 'education', 'policy_acknowledgment', 'other'].map(category => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Expires on (optional)<Input type="date" value={documentExpiresAt} onChange={event => setDocumentExpiresAt(event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Onboarding checklist<select value={selectedOnboarding} onChange={event => { setSelectedOnboarding(event.target.value); setSelectedChecklistItem(''); }} className="h-10 rounded-md border bg-background px-3"><option value="">No checklist link</option>{onboardingCases.map(onboarding => <option key={onboarding._id} value={onboarding._id}>Employee onboarding</option>)}</select></label>{selectedOnboarding && <label className="space-y-1 text-sm font-medium">Checklist item<select value={selectedChecklistItem} onChange={event => setSelectedChecklistItem(event.target.value)} className="h-10 rounded-md border bg-background px-3"><option value="">No item</option>{onboardingCases.find(item => item._id === selectedOnboarding)?.items.map(item => <option key={item._id} value={item._id}>{item.title} · {item.status}</option>)}</select></label>}<Button disabled={uploadingDocument}><Upload className="mr-2 h-4 w-4" />{uploadingDocument ? 'Encrypting and uploading…' : 'Upload private document'}</Button></form>}<p className="text-xs text-muted-foreground">Files are encrypted before being stored in the private HR document bucket. Access is controlled by HR sensitive-data permissions. Expiry dates are reminders only; files are not automatically deleted.</p>{documents.length ? <ul className="divide-y rounded-lg border">{documents.map(document => <li key={document._id} className="flex flex-wrap items-center justify-between gap-3 p-3"><span className="min-w-0"><span className="block truncate font-medium">{document.name}</span><span className="text-xs capitalize text-muted-foreground">{document.category.replaceAll('_', ' ')} · {(document.size / 1024).toFixed(0)} KB · {new Date(document.createdAt).toLocaleDateString()}{document.expiresAt ? ` · Expires ${new Date(document.expiresAt).toLocaleDateString()}` : ''}</span></span><span className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void downloadDocument(document)}><Download className="mr-1 h-4 w-4" />Download</Button>{access.canManageSensitive && <Button size="sm" variant="destructive" aria-label={`Delete ${document.name}`} onClick={() => void deleteDocument(document)}><Trash2 className="h-4 w-4" /></Button>}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No confidential documents stored for this employee.</p>}</CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5" />Employment history</CardTitle></CardHeader><CardContent>{actions.length ? <ol className="space-y-4">{actions.map((action) => <li key={action._id} className="border-l-2 border-primary/30 pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold capitalize">{action.actionType.replace('_', ' ')}</span><time className="text-sm text-muted-foreground">Effective {new Date(action.effectiveDate).toLocaleDateString()}</time></div>{action.summary && <p className="mt-1 text-sm">{action.summary}</p>}{action.reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {action.reason}</p>}{action.changes?.length ? <dl className="mt-2 grid gap-2 sm:grid-cols-2">{action.changes.map((change) => <div key={change.field} className="rounded-md bg-muted/60 px-3 py-2 text-sm"><dt className="font-medium capitalize">{change.field.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`).replaceAll('_', ' ')}</dt><dd className="text-muted-foreground">{formatActionValue(change.field, change.before)} → {formatActionValue(change.field, change.after)}</dd></div>)}</dl> : action.changedFields?.length ? <p className="mt-1 text-xs text-muted-foreground">Changed: {action.changedFields.join(', ')}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{action.actor?.name ? `by ${action.actor.name}` : ''}</p></li>)}</ol> : <p className="text-sm text-muted-foreground">No HR actions recorded yet.</p>}</CardContent></Card>
  </main>;
}
