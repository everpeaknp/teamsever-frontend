'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BriefcaseBusiness, Loader2, Plus, Search, Users } from 'lucide-react';
import { api } from '@/lib/axios';
import { loadAllHrEmployees } from '@/lib/hrEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type Employee = { _id: string; employeeNumber: string; employmentType: string; employmentStatus: string; jobTitle?: string; department?: string; startDate: string; user: { _id: string; name: string; email: string; profilePicture?: string } };
type Member = { _id: string; name: string; email: string; role: string };
type Pagination = { page: number; limit: number; total: number; pages: number };
type HrCapabilities = Record<string, boolean>;
const localDateValue = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function HrDirectoryPage() {
  const workspaceId = useParams().id as string;
  const router = useRouter();
  const loadGeneration = useRef(0);
  const currentWorkspace = useRef(workspaceId);
  currentWorkspace.current = workspaceId;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employeeOptionsLoaded, setEmployeeOptionsLoaded] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 });
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [debouncedDepartment, setDebouncedDepartment] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [canManageRecords, setCanManageRecords] = useState(false);
  const [capabilities, setCapabilities] = useState<HrCapabilities>({});
  const [departmentsList, setDepartmentsList] = useState<Array<{ _id: string; name: string }>>([]);
  const [form, setForm] = useState({ userId: '', employeeNumber: '', jobTitle: '', department: '', employmentType: 'full_time', startDate: localDateValue(), reportsTo: '', reason: '' });

  const load = async () => {
    if (currentWorkspace.current !== workspaceId) return;
    const generation = ++loadGeneration.current;
    const active = () => generation === loadGeneration.current && currentWorkspace.current === workspaceId;
    setLoading(true); setError(null);
    try {
      const capabilityResponse = await api.get(`/workspaces/${workspaceId}/hr/capabilities`);
      if (!active()) return;
      const nextCapabilities = capabilityResponse.data.data || {};
      setCapabilities(nextCapabilities);
      const canViewRecords = ['VIEW_HR_RECORDS', 'VIEW_HR_TEAM_RECORDS', 'VIEW_HR_LOCATION_RECORDS', 'MANAGE_HR_RECORDS']
        .some((permission) => nextCapabilities[permission] === true);
      if (!canViewRecords) {
        const destinations = [
          ['VIEW_HR_PAYROLL', 'payroll'],
          ['VIEW_HR_RECRUITING', 'recruiting'],
          ['VIEW_HR_CANDIDATE_DATA', 'recruiting'],
        ] as const;
        const destination = destinations.find(([permission]) => nextCapabilities[permission] === true)?.[1] || 'me';
        router.replace('/workspace/' + workspaceId + '/hr/' + destination);
        return;
      }
      const directory = await api.get(`/workspaces/${workspaceId}/hr/employees`, { params: { limit: 50, page, search: debouncedSearch || undefined, department: debouncedDepartment || undefined, role: role || undefined, status: status || undefined } });
      if (!active()) return;
      setEmployees(directory.data.data || []);
      setCanManageRecords(directory.data.permissions?.canManageRecords === true);
      setPagination(directory.data.pagination || { page, limit: 50, total: directory.data.data?.length || 0, pages: 1 });
    } catch (error: any) {
      if (!active()) return;
      if (error?.response?.status === 403) {
        router.replace(`/workspace/${workspaceId}/hr/me`);
        return;
      }
      toast.error(error?.response?.data?.message || 'Could not load employee records');
      setError(error?.response?.data?.message || 'Could not load employee records');
      setEmployees([]);
    } finally { if (active()) setLoading(false); }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => { setPage(1); setDebouncedSearch(search.trim()); setDebouncedDepartment(department.trim()); }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, department]);
  useEffect(() => { void load(); return () => { loadGeneration.current++; }; }, [workspaceId, page, debouncedSearch, debouncedDepartment, role, status]);
  useEffect(() => {
    api.get(`/workspaces/${workspaceId}/hr/departments`)
      .then((res) => setDepartmentsList(res.data.data || []))
      .catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (!canManageRecords) return;
    api.get(`/workspaces/${workspaceId}/members`)
      .then(response => setMembers(response.data.data || []))
      .catch((error: any) => toast.error(error?.response?.data?.message || 'Could not load workspace members'));
  }, [workspaceId, canManageRecords]);
  useEffect(() => {
    if (!canManageRecords) return;
    let active = true;
    setAllEmployees([]);
    setEmployeeOptionsLoaded(false);
    loadAllHrEmployees<Employee>(workspaceId)
      .then(records => { if (active) { setAllEmployees(records); setEmployeeOptionsLoaded(true); } })
      .catch((error: any) => { if (active) toast.error(error?.response?.data?.message || 'Could not load employee manager options'); });
    return () => { active = false; };
  }, [workspaceId, canManageRecords]);

  const availableMembers = useMemo(() => {
    const existing = new Set(allEmployees.map((employee) => employee.user?._id));
    return members.filter((member) => !existing.has(member._id));
  }, [allEmployees, members]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/employees`, form);
      toast.success('Employee record created');
      setShowCreate(false);
      setForm({ userId: '', employeeNumber: '', jobTitle: '', department: '', employmentType: 'full_time', startDate: localDateValue(), reportsTo: '', reason: '' });
      setAllEmployees(await loadAllHrEmployees<Employee>(workspaceId));
      setEmployeeOptionsLoaded(true);
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create employee record'); }
    finally { setSaving(false); }
  };

  const visibleEmployees = employees;
  const canViewRecords = ['VIEW_HR_RECORDS', 'VIEW_HR_TEAM_RECORDS', 'VIEW_HR_LOCATION_RECORDS', 'MANAGE_HR_RECORDS']
    .some((permission) => capabilities[permission] === true);
  const canViewWorkspaceSchedules = capabilities.VIEW_HR_RECORDS === true || capabilities.MANAGE_HR_RECORDS === true;
  const featureLinks = [
    { label: 'My HR', href: '/workspace/' + workspaceId + '/hr/me', visible: true },
    { label: 'Leave & balances', href: '/workspace/' + workspaceId + '/hr/leaves', visible: true },
    { label: 'Employee directory', href: '/workspace/' + workspaceId + '/hr/people', visible: canViewRecords },
    { label: 'Attendance & leave', href: '/workspace/' + workspaceId + '/attendance', visible: true },
    { label: 'Work schedules', href: '/workspace/' + workspaceId + '/hr/schedules', visible: canViewWorkspaceSchedules },
    { label: 'Attendance corrections', href: '/workspace/' + workspaceId + '/hr/attendance-corrections', visible: canViewRecords || capabilities.APPROVE_HR_ATTENDANCE_CORRECTIONS === true },
    { label: 'Organization', href: '/workspace/' + workspaceId + '/hr/organization', visible: canViewRecords },
    { label: 'Hiring', href: '/workspace/' + workspaceId + '/hr/recruiting', visible: capabilities.VIEW_HR_RECRUITING === true || capabilities.VIEW_HR_CANDIDATE_DATA === true || capabilities.VIEW_HR_COMPENSATION === true },
    { label: 'Onboarding', href: '/workspace/' + workspaceId + '/hr/onboarding', visible: capabilities.VIEW_HR_ONBOARDING === true && canViewRecords },
    { label: 'Performance', href: '/workspace/' + workspaceId + '/hr/development', visible: capabilities.VIEW_HR_PERFORMANCE === true && canViewRecords },
    { label: 'Employee relations', href: '/workspace/' + workspaceId + '/hr/relations', visible: capabilities.VIEW_HR_RELATIONS === true && canViewRecords },
    { label: 'Reports', href: '/workspace/' + workspaceId + '/hr/reports', visible: capabilities.VIEW_HR_REPORTS === true && canViewRecords },
    { label: 'Payroll', href: '/workspace/' + workspaceId + '/hr/payroll', visible: capabilities.VIEW_HR_PAYROLL === true },
    { label: 'Reimbursements', href: '/workspace/' + workspaceId + '/hr/reimbursements', visible: capabilities.VIEW_HR_REIMBURSEMENTS === true && canViewRecords },
    { label: 'Team engagement', href: '/workspace/' + workspaceId + '/hr/engagement', visible: true },
    { label: 'Retention & legal holds', href: '/workspace/' + workspaceId + '/hr/retention', visible: capabilities.VIEW_HR_SENSITIVE_DATA === true && canViewRecords },
  ].filter((item) => item.visible);

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BriefcaseBusiness className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Human Resources</h1><p className="mt-1 text-sm text-muted-foreground">Employee directory and organization records</p></div></div></div>
      <div className="flex flex-wrap gap-2">{featureLinks.map((item) => <Link key={item.href} href={item.href} className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted">{item.label}</Link>)}{canManageRecords && <Button onClick={() => setShowCreate(!showCreate)} disabled={!employeeOptionsLoaded || !availableMembers.length}><Plus className="mr-2 h-4 w-4" />Add employee record</Button>}</div>
    </header>

    {showCreate && <Card><CardContent className="p-5"><form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1 text-sm font-medium">Workspace member<select required value={form.userId} onChange={(event) => setForm({ ...form, userId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="">Select member</option>{availableMembers.map((member) => <option key={member._id} value={member._id}>{member.name} · {member.email}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Employee number<Input required value={form.employeeNumber} onChange={(event) => setForm({ ...form, employeeNumber: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Start date<Input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Job title<Input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} /></label>
      <label className="space-y-1 text-sm font-medium">Department
        <select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">
          <option value="">Select department (or none)</option>
          {departmentsList.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium">Employment type<select value={form.employmentType} onChange={(event) => setForm({ ...form, employmentType: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3">{['full_time', 'part_time', 'contract', 'intern', 'temporary'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Reports to<select value={form.reportsTo} onChange={(event) => setForm({ ...form, reportsTo: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3"><option value="">No manager</option>{allEmployees.filter((employee) => employee.user?._id !== form.userId).map((employee) => <option key={employee.user._id} value={employee.user._id}>{employee.user.name} · {employee.employeeNumber}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium sm:col-span-2 lg:col-span-3">Hiring note / reason<Input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create record</Button><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
    </form></CardContent></Card>}

    <div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, employee number, title..." className="pl-9" /></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1 text-sm font-medium">Department
        <select value={department} onChange={(event) => { setPage(1); setDepartment(event.target.value); }} className="h-10 w-full rounded-md border bg-background px-3">
          <option value="">All departments</option>
          {departmentsList.map((d) => <option key={d._id} value={d.name}>{d.name}</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm font-medium">Workspace role<select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">All roles</option>{['owner', 'admin', 'operations_manager', 'project_manager', 'qa', 'developer', 'member', 'guest'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium">Employment status<select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="h-10 w-full rounded-md border bg-background px-3"><option value="">All statuses</option>{['active', 'probation', 'on_leave', 'suspended', 'terminated', 'resigned'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
    </div>
    {error && !loading && <Card><CardContent className="space-y-3 py-6"><p role="alert" className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={load}>Retry directory</Button></CardContent></Card>}
    {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading employee records</div> : error ? null : visibleEmployees.length ? <><section aria-label="Employee directory" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleEmployees.map((employee) => <Link key={employee._id} href={`/workspace/${workspaceId}/hr/${employee._id}`} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Card className="h-full transition-colors hover:border-primary/50"><CardContent className="flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><Users className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{employee.user?.name || 'Workspace member'}</span><span className="block truncate text-sm text-muted-foreground">{employee.jobTitle || 'No job title'}{employee.department ? ` · ${employee.department}` : ''}</span><span className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-muted px-2 py-1">{employee.employeeNumber}</span><span className="rounded-full bg-primary/10 px-2 py-1 capitalize text-primary">{employee.employmentStatus.replace('_', ' ')}</span></span></span></CardContent></Card></Link>)}</section>{pagination.pages > 1 && <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span><div className="flex gap-2"><Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(value => Math.max(1, value - 1))}>Previous</Button><Button variant="outline" disabled={page >= pagination.pages || loading} onClick={() => setPage(value => Math.min(pagination.pages, value + 1))}>Next</Button></div></div>}</> : <Card><CardContent className="py-14 text-center"><Users className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-3 font-semibold">{debouncedSearch ? 'No matching employees' : 'No employee records found'}</h2><p className="mt-1 text-sm text-muted-foreground">{debouncedSearch ? 'Try another name, email, employee number, or title.' : 'Add an HR record for an existing workspace member to begin building the directory.'}</p></CardContent></Card>}
  </main>;
}
