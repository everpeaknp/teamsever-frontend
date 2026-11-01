'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, Loader2, Users } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
import { toast } from 'sonner';

type HrCapabilities = Record<string, boolean>;
type DashboardData = Record<string, any>;
const dateOnly = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const number = (value: unknown) => typeof value === 'number' ? value : Number(value || 0);
const rows = (value: unknown) => Array.isArray(value) ? value as Array<Record<string, any>> : [];
const label = (value: unknown) => String(value || '').replaceAll('_', ' ');
const money = (amount: number, currency: string) => `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)}`;

export default function HrDashboardPage() {
  const workspaceId = useParams().id as string;
  const [capabilities, setCapabilities] = useState<HrCapabilities>({});
  const [data, setData] = useState<DashboardData | null>(null);
  const [attendance, setAttendance] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const capabilityResponse = await api.get(`/workspaces/${workspaceId}/hr/capabilities`);
        const granted = capabilityResponse.data.data || {};
        if (!active) return;
        setCapabilities(granted);
        const canViewRecords = ['VIEW_HR_RECORDS', 'VIEW_HR_TEAM_RECORDS', 'VIEW_HR_LOCATION_RECORDS', 'MANAGE_HR_RECORDS'].some((permission) => granted[permission] === true);
        if (canViewRecords && granted.VIEW_HR_REPORTS === true) {
          const from = new Date(today.getFullYear(), today.getMonth(), 1);
          const [overview, schedule] = await Promise.all([
            api.get(`/workspaces/${workspaceId}/hr/overview`, { params: { from: dateOnly(from), to: dateOnly(today) } }),
            api.get(`/workspaces/${workspaceId}/hr/schedule-attendance`, { params: { from: dateOnly(from), to: dateOnly(today) } }),
          ]);
          if (!active) return;
          setData(overview.data.data || {});
          setAttendance(schedule?.data?.data || null);
        } else if (canViewRecords) {
          const directory = await api.get(`/workspaces/${workspaceId}/hr/employees`, { params: { page: 1, limit: 1 } });
          if (!active) return;
          setData({ headcount: { total: number(directory.data.pagination?.total) } });
        }
      } catch (loadError: any) {
        if (!active) return;
        setError(loadError?.response?.data?.message || 'Could not load the HR dashboard');
        toast.error(loadError?.response?.data?.message || 'Could not load the HR dashboard');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [workspaceId, today]);

  const canViewRecords = ['VIEW_HR_RECORDS', 'VIEW_HR_TEAM_RECORDS', 'VIEW_HR_LOCATION_RECORDS', 'MANAGE_HR_RECORDS'].some((permission) => capabilities[permission] === true);
  const canSeeOverview = capabilities.VIEW_HR_REPORTS === true && canViewRecords;
  const headcount = data?.headcount || {};
  const activeCount = rows(headcount.byStatus).reduce((total, item) => total + (item._id === 'active' || item._id === 'probation' ? number(item.count) : 0), 0);
  const pendingLeave = rows(data?.leave).find((item) => item._id === 'pending');
  const attendanceDays = rows(attendance?.daily);
  const attendanceToday = attendanceDays.find((day) => day.date === dateOnly(today)) || {};
  const hiringCounts = rows(data?.hiring?.requisitions).reduce((sum, item) => sum + number(item.count), 0);
  const payroll = rows(data?.payroll);
  const taskStats = data?.tasks || {};
  const quickLinks = [
    { label: 'My HR', href: `/workspace/${workspaceId}/hr/me`, visible: true },
    { label: 'Leave & balances', href: `/workspace/${workspaceId}/hr/leaves`, visible: true },
    { label: 'Employee directory', href: `/workspace/${workspaceId}/hr/people`, visible: canViewRecords },
    { label: 'Organization', href: `/workspace/${workspaceId}/hr/organization`, visible: canViewRecords },
    { label: 'Hiring', href: `/workspace/${workspaceId}/hr/recruiting`, visible: capabilities.VIEW_HR_RECRUITING === true || capabilities.VIEW_HR_CANDIDATE_DATA === true || capabilities.VIEW_HR_COMPENSATION === true },
    { label: 'Onboarding', href: `/workspace/${workspaceId}/hr/onboarding`, visible: canViewRecords && capabilities.VIEW_HR_ONBOARDING === true },
    { label: 'Payroll', href: `/workspace/${workspaceId}/hr/payroll`, visible: capabilities.VIEW_HR_PAYROLL === true },
    { label: 'Schedules', href: `/workspace/${workspaceId}/hr/schedules`, visible: (capabilities.VIEW_HR_RECORDS === true || capabilities.MANAGE_HR_RECORDS === true) },
    { label: 'Performance', href: `/workspace/${workspaceId}/hr/development`, visible: canViewRecords && capabilities.VIEW_HR_PERFORMANCE === true },
    { label: 'Employee relations', href: `/workspace/${workspaceId}/hr/relations`, visible: canViewRecords && capabilities.VIEW_HR_RELATIONS === true },
    { label: 'Reimbursements', href: `/workspace/${workspaceId}/hr/reimbursements`, visible: canViewRecords && capabilities.VIEW_HR_REIMBURSEMENTS === true },
    { label: 'Reports', href: `/workspace/${workspaceId}/hr/reports`, visible: canSeeOverview },
    { label: 'Retention', href: `/workspace/${workspaceId}/hr/retention`, visible: canViewRecords && capabilities.VIEW_HR_SENSITIVE_DATA === true },
  ].filter((item) => item.visible);

  return (
    <PlanFeatureGate
      workspaceId={workspaceId}
      moduleKey="hr"
      featureName="Human Resources"
      description="Workforce management, organization chart, and employee lifecycle tools are not enabled on your workspace's current plan."
    >
      <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BriefcaseBusiness className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Human Resources</h1><p className="mt-1 text-sm text-muted-foreground">Workforce overview and people operations</p></div></div>
          <Button asChild variant="outline"><Link href={`/workspace/${workspaceId}/attendance`}>Attendance & leave <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </header>

        {loading ? <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading HR dashboard</div> : error ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></CardContent></Card> : <>
          {!canSeeOverview ? <Card><CardContent className="py-6"><h2 className="font-semibold">Your HR workspace</h2><p className="mt-1 text-sm text-muted-foreground">Use the links below to open the HR areas available to your role.</p>{data?.headcount && <p className="mt-4 text-2xl font-bold">{number(headcount.total)} <span className="text-sm font-normal text-muted-foreground">employee records in your access scope</span></p>}</CardContent></Card> : <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Employees" value={number(headcount.total)} detail={`${activeCount} active or on probation`} icon={<Users className="h-5 w-5" />} />
              <Metric title="Pending leave" value={number(pendingLeave?.requests)} detail={pendingLeave ? `${number(pendingLeave.days)} requested days` : 'No pending requests'} icon={<CalendarDays className="h-5 w-5" />} />
              <Metric title="Late arrivals today" value={number(attendanceToday.late)} detail={`${number(attendanceToday.absent)} absences after shift end`} icon={<Clock3 className="h-5 w-5" />} />
              <Metric title="Open assigned tasks" value={number(taskStats.open)} detail={`${number(taskStats.overdue)} overdue`} icon={<Activity className="h-5 w-5" />} />
            </section>
            <section className="grid gap-4 xl:grid-cols-2">
              <Card><CardHeader><CardTitle>Workforce</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Hires this period</p><p className="mt-1 text-2xl font-semibold">{number(headcount.hires)}</p></div><div className="rounded-lg border p-3"><p className="text-sm text-muted-foreground">Turnover</p><p className="mt-1 text-2xl font-semibold">{number(headcount.turnoverRate)}%</p></div></div><div><h3 className="mb-2 text-sm font-semibold">By department</h3>{rows(headcount.byDepartment).length ? <ul className="space-y-2">{rows(headcount.byDepartment).slice(0, 6).map((item) => <li key={item._id} className="flex justify-between gap-4 text-sm"><span className="truncate">{item._id || 'Unassigned'}</span><span className="font-medium">{number(item.count)}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">No department data yet.</p>}</div></CardContent></Card>
              <Card><CardHeader><CardTitle>Attendance today</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><AttendanceMetric title="Present" value={number(attendanceToday.present)} /><AttendanceMetric title="Absent" value={number(attendanceToday.absent)} /><AttendanceMetric title="On leave" value={number(attendanceToday.onLeave)} /><AttendanceMetric title="Late" value={number(attendanceToday.late)} /></div><p className="mt-4 text-xs text-muted-foreground">Based on assigned work schedules. Absences are counted after the shift ends. Clocked {Math.round(number(data?.attendance?.clockedSeconds) / 3600 * 10) / 10} hours this month.</p></CardContent></Card>
              <Card className="xl:col-span-2"><CardHeader><CardTitle>Attendance trend</CardTitle></CardHeader><CardContent>{attendanceDays.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 font-medium">Date</th>{['Scheduled', 'Present', 'Absent', 'Late', 'On leave', 'Left early'].map((column) => <th key={column} className="px-3 py-2 text-right font-medium whitespace-nowrap">{column}</th>)}</tr></thead><tbody>{attendanceDays.slice(-7).map((day) => <tr key={day.date} className="border-b last:border-0"><td className="py-3 whitespace-nowrap">{day.date}</td>{['scheduled', 'present', 'absent', 'late', 'onLeave', 'earlyDepartures'].map((key) => <td key={key} className="px-3 py-3 text-right tabular-nums">{number(day[key])}</td>)}</tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Assign work schedules to begin tracking attendance trends.</p>}</CardContent></Card>
              {capabilities.VIEW_HR_RECRUITING && <Card><CardHeader><CardTitle>Hiring</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between gap-4"><div><p className="text-3xl font-semibold">{hiringCounts}</p><p className="text-sm text-muted-foreground">requisitions created this month</p></div><Button asChild variant="outline" size="sm"><Link href={`/workspace/${workspaceId}/hr/recruiting`}>Open pipeline</Link></Button></div></CardContent></Card>}
              {capabilities.VIEW_HR_PERFORMANCE && <Card><CardHeader><CardTitle>Growth & milestones</CardTitle></CardHeader><CardContent><p className="mb-3 text-sm text-muted-foreground">Training overdue: {number(data?.development?.overdueTrainingOrCertifications)}</p>{rows(data?.upcomingMilestones).length ? <ul className="space-y-2">{rows(data?.upcomingMilestones).slice(0, 5).map((item, index) => <li key={`${item.employee?._id || index}-${item.type}`} className="flex flex-wrap justify-between gap-2 text-sm"><span>{item.employee?.name || item.employeeNumber} · {label(item.type)}</span><time className="text-muted-foreground">{new Date(item.date).toLocaleDateString()}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">No upcoming start-date or probation milestones.</p>}</CardContent></Card>}
              {capabilities.VIEW_HR_PAYROLL && <Card><CardHeader><CardTitle>Payroll</CardTitle></CardHeader><CardContent>{payroll.length ? <ul className="space-y-2">{payroll.map((item) => { const total = number(item.baseAmount) + number(item.earnings) + number(item.employerContributions); return <li key={item._id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{item._id} · {number(item.runs)} approved or paid runs</span><span className="font-semibold">{money(total, item._id)}</span></li>; })}</ul> : <p className="text-sm text-muted-foreground">No approved or paid payroll in this period.</p>}<Button asChild className="mt-4" variant="outline" size="sm"><Link href={`/workspace/${workspaceId}/hr/payroll`}>View payroll runs</Link></Button></CardContent></Card>}
            </section>
          </>}
          <section className="space-y-3"><h2 className="text-lg font-semibold">HR tools</h2><div className="flex flex-wrap gap-2">{quickLinks.map((item) => <Button key={item.href} asChild variant="outline"><Link href={item.href}>{item.label}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>)}</div></section>
        </>}
      </main>
    </PlanFeatureGate>
  );
}

function Metric({ title, value, detail, icon }: { title: string; value: number; detail: string; icon: React.ReactNode }) {
  return <Card><CardContent className="flex items-start justify-between gap-3 p-5"><div><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span></CardContent></Card>;
}

function AttendanceMetric({ title, value, suffix }: { title: string; value: number; suffix?: string }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-xl font-semibold">{value}{suffix ? ` ${suffix}` : ''}</p></div>;
}
