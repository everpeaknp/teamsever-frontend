'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

type EvaluationEmployee = {
  employeeRecordId?: string | null;
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  jobTitle: string;
  overallScore: number;
  evaluationGrade: string;
  totalAssignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  onTimeTasks: number;
  taskCompletionRate: string;
  onTimeDeliveryRate: string;
  taskHoursLogged: number;
  daysPresent: number;
  totalHoursWorked: number;
  overtimeHours: number;
  approvedLeaveDays: number;
  remoteWorkDays: number;
  siteVisitsTotal: number;
  siteVisitsCompleted: number;
  siteVisitsVerified: number;
  approvedSiteVisitPasses: number;
  fieldDistanceKm: number;
  goalsTotal: number;
  goalsCompleted: number;
  reviewsCompleted: number;
  averageRating: number | null;
  overdueTrainingCount: number;
  grievancesTotal: number;
  grievancesOpen: number;
  grievancesResolved: number;
  disciplinaryCases: number;
};

type EvaluationReport = {
  summary: {
    totalEmployees: number;
    totalAssignedTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    globalTaskCompletionRate: number;
    globalOnTimeDeliveryRate: number;
    totalTaskHoursLogged: number;
    totalDaysPresent: number;
    totalHoursWorked: number;
    totalOvertimeHours: number;
    totalApprovedLeaveDays: number;
    totalRemoteWorkDays: number;
    totalSiteVisits: number;
    completedSiteVisits: number;
    verifiedSiteVisits: number;
    approvedSiteVisitPasses: number;
    totalFieldDistanceKm: number;
    totalGrievances: number;
    openGrievances: number;
    resolvedGrievances: number;
    totalDisciplinaryCases: number;
    averageOverallScore: number;
  };
  employees: EvaluationEmployee[];
};

type Report = {
  period: { from: string; to: string };
  permissions: { canViewRecruiting: boolean; canViewCandidates: boolean; canViewPerformance: boolean; canViewPayroll: boolean; canViewRelations?: boolean };
  headcount: { total: number; opening: number; turnoverRate: number; byStatus: { _id: string; count: number }[]; byDepartment: { _id: string; count: number }[]; hires: number; exits: number };
  attendance: { clockedSeconds: number; completedClockEntries: number };
  fieldTracking?: { totalSiteVisits: number; completedSiteVisits: number; verifiedSiteVisits: number; approvedSiteVisitPasses: number; totalFieldDistanceKm: number };
  relations?: { totalCases: number; openCases: number; resolvedCases: number; grievances: number; disciplinary: number } | null;
  tasks?: { totalAssigned?: number; completed?: number; open: number; overdue: number; completionRate?: number };
  leave: { _id: string; requests: number; days: number }[];
  hiring: { requisitions: { _id: string; count: number }[]; candidates: { _id: string; count: number }[] };
  development: { overdueTrainingOrCertifications: number; byKindAndStatus?: { _id: { kind: string; status: string }; count: number }[] };
  payroll: { _id: string; baseAmount: number; earnings: number; deductions: number; employerContributions: number; netAmount: number; runs: number }[];
};

export default function HrReportsPage() {
  const workspaceId = useParams().id as string;
  const [data, setData] = useState<Report | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const [range, setRange] = useState(() => { const now = new Date(); return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: localDate(now) }; });
  const load = async () => {
    setLoading(true);
    try {
      const [response, evalRes] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/overview`, { params: range }),
        api.get(`/workspaces/${workspaceId}/hr/reports/employee-evaluation`, { params: range }).catch(() => ({ data: { data: null } })),
      ]);
      setData(response.data.data);
      setEvaluation(evalRes.data?.data || null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not load HR reports');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [workspaceId, range.from, range.to]);
  const statusLabel = (value: string) => value.replaceAll('_', ' ');
  const downloadEmployee360Csv = () => {
    if (!evaluation?.employees?.length) return;
    const headers = [
      'Emp ID', 'Name', 'Email', 'Department', 'Job Title', '360 Score', 'Grade',
      'Assigned Tasks', 'Completed Tasks', 'In Progress', 'Overdue Tasks', 'Completion Rate', 'On-Time Rate', 'Task Hours',
      'Days Present', 'Shift Hours', 'Overtime Hours', 'Leave Days', 'Remote Days',
      'Site Visits', 'Completed Visits', 'Verified Visits', 'Field Distance (km)',
      'Goals Completed', 'Reviews', 'Avg Rating', 'Overdue Training',
      'Grievances Total', 'Grievances Open', 'Grievances Resolved', 'Disciplinary Cases',
    ];
    const rows = evaluation.employees.map((r) => [
      r.employeeId, r.name, r.email, r.department, r.jobTitle, `${r.overallScore}%`, r.evaluationGrade,
      r.totalAssignedTasks, r.completedTasks, r.inProgressTasks, r.overdueTasks, r.taskCompletionRate, r.onTimeDeliveryRate, r.taskHoursLogged,
      r.daysPresent, r.totalHoursWorked, r.overtimeHours, r.approvedLeaveDays, r.remoteWorkDays,
      r.siteVisitsTotal, r.siteVisitsCompleted, r.siteVisitsVerified, r.fieldDistanceKm,
      `${r.goalsCompleted}/${r.goalsTotal}`, r.reviewsCompleted, r.averageRating ?? 'N/A', r.overdueTrainingCount,
      r.grievancesTotal, r.grievancesOpen, r.grievancesResolved, r.disciplinaryCases,
    ]);
    const csv = [headers, ...rows].map(row => row.map(value => {
      const text = String(value ?? '');
      const safe = typeof value === 'string' && /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `employee-360-evaluation-${range.from}-to-${range.to}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadReport = () => {
    if (!data) return;
    const rows: Array<[string, string, string | number]> = [
      ['Headcount', 'Employees at period start', data.headcount.opening], ['Headcount', 'Employees at period end', data.headcount.total], ['Headcount', 'Hires in period', data.headcount.hires], ['Headcount', 'Exits in period', data.headcount.exits], ['Turnover', 'Rate (%)', data.headcount.turnoverRate],
      ['Attendance', 'Clocked hours', (data.attendance.clockedSeconds / 3600).toFixed(2)], ['Attendance', 'Completed clock entries', data.attendance.completedClockEntries],
      ...data.headcount.byStatus.map(row => ['Employees by status', statusLabel(row._id), row.count] as [string, string, number]),
      ...data.headcount.byDepartment.map(row => ['Employees by department', row._id, row.count] as [string, string, number]),
      ...data.leave.map(row => ['Leave', `${statusLabel(row._id)} · days`, row.days] as [string, string, number]),
      ...data.leave.map(row => ['Leave', `${statusLabel(row._id)} · requests`, row.requests] as [string, string, number]),
      ...data.hiring.requisitions.map(row => ['Requisitions', statusLabel(row._id), row.count] as [string, string, number]),
      ...data.hiring.candidates.map(row => ['Candidates', statusLabel(row._id), row.count] as [string, string, number]),
      ['Development', 'Overdue or due training/certifications', data.development.overdueTrainingOrCertifications],
      ...(data.development.byKindAndStatus || []).map(row => ['Development', `${statusLabel(row._id.kind)} · ${statusLabel(row._id.status)}`, row.count] as [string, string, number]),
      ...data.payroll.flatMap(row => [
        ['Payroll', `${row._id} · base (${row.runs} run(s))`, row.baseAmount] as [string, string, number],
        ['Payroll', `${row._id} · earnings`, row.earnings] as [string, string, number],
        ['Payroll', `${row._id} · deductions`, row.deductions] as [string, string, number],
        ['Payroll', `${row._id} · employer contributions`, row.employerContributions] as [string, string, number],
        ['Payroll', `${row._id} · net pay`, row.netAmount] as [string, string, number],
        ['Payroll', `${row._id} · employer cost`, row.baseAmount + row.earnings + row.employerContributions] as [string, string, number],
      ]),
    ];
    const csv = [['Category', 'Metric', 'Value'], ...rows].map(row => row.map(value => {
      const text = String(value);
      const safe = typeof value === 'string' && /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replaceAll('"', '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `hr-report-${range.from}-to-${range.to}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link><div className="flex flex-wrap items-center gap-3"><Link href={`/workspace/${workspaceId}/analytics/team-performance`} className="text-sm font-medium text-primary hover:underline">Employee task &amp; performance evaluation</Link><Link href={`/workspace/${workspaceId}/attendance`} className="text-sm text-primary hover:underline">Attendance &amp; leave</Link><Link href={`/workspace/${workspaceId}/hr/schedules`} className="text-sm text-primary hover:underline">Schedule comparison</Link><Link href={`/workspace/${workspaceId}/hr/development`} className="text-sm text-primary hover:underline">Performance</Link></div></div><header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><BarChart3 className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold">HR &amp; Workforce 360° Reports</h1><p className="text-sm text-muted-foreground">Global and per-employee evaluation across tasks, attendance, leave, site tracking, payroll, growth, and grievances.</p></div></header><Card><CardContent className="flex flex-wrap items-end gap-3 p-4"><label className="space-y-1 text-sm font-medium">From<Input type="date" value={range.from} onChange={e => setRange({ ...range, from: e.target.value })} /></label><label className="space-y-1 text-sm font-medium">To<Input type="date" value={range.to} onChange={e => setRange({ ...range, to: e.target.value })} /></label><Button type="button" variant="outline" disabled={!data || loading} onClick={downloadReport}><Download className="mr-2 h-4 w-4" />Export Global CSV</Button>{evaluation?.employees?.length ? <Button type="button" onClick={downloadEmployee360Csv}><Download className="mr-2 h-4 w-4" />Export Employee 360° CSV</Button> : null}</CardContent></Card>
    {loading ? <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading HR overview</div> : data ? <><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[
      { label: 'Headcount', value: data.headcount.total || evaluation?.summary?.totalEmployees || 0 },
      { label: 'Avg 360° Score', value: `${evaluation?.summary?.averageOverallScore ?? 100}%` },
      { label: 'Task Completion', value: `${evaluation?.summary?.globalTaskCompletionRate ?? data.tasks?.completionRate ?? 100}%` },
      { label: 'On-Time Delivery', value: `${evaluation?.summary?.globalOnTimeDeliveryRate ?? 100}%` },
      { label: 'Attendance Hours', value: (data.attendance.clockedSeconds / 3600).toFixed(1) },
      { label: 'Site Visits', value: evaluation?.summary?.totalSiteVisits ?? data.fieldTracking?.totalSiteVisits ?? 0 },
    ].map(metric => <Card key={metric.label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-2 text-3xl font-bold">{metric.value}</p></CardContent></Card>)}</section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Global tasks &amp; delivery</h2><div className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2"><span>Assigned tasks</span><strong>{evaluation?.summary?.totalAssignedTasks ?? data.tasks?.totalAssigned ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Completed tasks</span><strong>{evaluation?.summary?.completedTasks ?? data.tasks?.completed ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>In progress</span><strong>{evaluation?.summary?.inProgressTasks ?? data.tasks?.open ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Overdue tasks</span><strong>{evaluation?.summary?.overdueTasks ?? data.tasks?.overdue ?? 0}</strong></div>
          <div className="flex justify-between"><span>On-time delivery rate</span><strong>{evaluation?.summary?.globalOnTimeDeliveryRate ?? 100}%</strong></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Field &amp; site tracking</h2><div className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2"><span>Total site visits</span><strong>{evaluation?.summary?.totalSiteVisits ?? data.fieldTracking?.totalSiteVisits ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Completed visits</span><strong>{evaluation?.summary?.completedSiteVisits ?? data.fieldTracking?.completedSiteVisits ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Geofence-verified visits</span><strong>{evaluation?.summary?.verifiedSiteVisits ?? data.fieldTracking?.verifiedSiteVisits ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Approved site passes</span><strong>{evaluation?.summary?.approvedSiteVisitPasses ?? data.fieldTracking?.approvedSiteVisitPasses ?? 0}</strong></div>
          <div className="flex justify-between"><span>Total GPS distance</span><strong>{evaluation?.summary?.totalFieldDistanceKm ?? data.fieldTracking?.totalFieldDistanceKm ?? 0} km</strong></div>
        </div></CardContent></Card>
        <Card><CardContent className="p-5"><h2 className="mb-3 font-semibold">Grievances &amp; relations</h2><div className="space-y-2 text-sm">
          <div className="flex justify-between border-b pb-2"><span>Grievances &amp; complaints</span><strong>{evaluation?.summary?.totalGrievances ?? data.relations?.grievances ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Open grievances</span><strong>{evaluation?.summary?.openGrievances ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Resolved grievances</span><strong>{evaluation?.summary?.resolvedGrievances ?? 0}</strong></div>
          <div className="flex justify-between border-b pb-2"><span>Disciplinary cases</span><strong>{evaluation?.summary?.totalDisciplinaryCases ?? data.relations?.disciplinary ?? 0}</strong></div>
          <div className="flex justify-between"><span>Turnover rate</span><strong>{data.headcount.turnoverRate}%</strong></div>
        </div></CardContent></Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">{[{ title: 'Employees by status', rows: data.headcount.byStatus.map(row => [statusLabel(row._id), row.count] as const) }, { title: 'Team headcount', rows: data.headcount.byDepartment.map(row => [row._id, row.count] as const) }, { title: 'Leave requests', rows: data.leave.map(row => [`${statusLabel(row._id)} · ${row.days} days`, row.requests] as const) }, ...(data.permissions.canViewRecruiting || data.permissions.canViewCandidates ? [{ title: 'Hiring pipeline', rows: [...(data.permissions.canViewRecruiting ? data.hiring.requisitions.map(row => [`Position · ${statusLabel(row._id)}`, row.count] as const) : []), ...(data.permissions.canViewCandidates ? data.hiring.candidates.map(row => [`Candidate · ${statusLabel(row._id)}`, row.count] as const) : [])] }] : [])].map(section => <Card key={section.title}><CardContent className="p-5"><h2 className="mb-3 font-semibold">{section.title}</h2>{section.rows.length ? <div className="space-y-2">{section.rows.map(([name, value]) => <div key={name} className="flex justify-between border-b pb-2 text-sm last:border-0"><span className="capitalize">{name}</span><strong>{value}</strong></div>)}</div> : <p className="text-sm text-muted-foreground">No data in this period.</p>}</CardContent></Card>)}</section>
      {evaluation?.employees?.length ? (
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Per-Employee 360° Evaluation ({evaluation.employees.length})</h2>
                <p className="text-xs text-muted-foreground">Combined scorecard across task delivery, attendance, leave, field visits, reviews, and grievances.</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={downloadEmployee360Csv}><Download className="mr-2 h-4 w-4" />Export 360° Table CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Employee</th>
                    <th className="py-2 pr-4">360° Score</th>
                    <th className="py-2 pr-4">Tasks (Done / Total)</th>
                    <th className="py-2 pr-4">On-Time %</th>
                    <th className="py-2 pr-4">Attendance</th>
                    <th className="py-2 pr-4">Leave / Remote</th>
                    <th className="py-2 pr-4">Site Visits</th>
                    <th className="py-2 pr-4">Goals &amp; Rating</th>
                    <th className="py-2 pr-4">Grievances</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {evaluation.employees.map((emp) => (
                    <tr key={`${emp.userId}-${emp.employeeId}`} className="hover:bg-muted/40">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">{emp.employeeId} · {emp.department}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                          {emp.overallScore}% · {emp.evaluationGrade}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div>{emp.completedTasks}/{emp.totalAssignedTasks} ({emp.taskCompletionRate})</div>
                        {emp.overdueTasks > 0 && <div className="text-xs text-rose-500">{emp.overdueTasks} overdue</div>}
                      </td>
                      <td className="py-3 pr-4 font-medium">{emp.onTimeDeliveryRate}</td>
                      <td className="py-3 pr-4">
                        <div>{emp.daysPresent}d · {emp.totalHoursWorked}h</div>
                        {emp.overtimeHours > 0 && <div className="text-xs text-muted-foreground">+{emp.overtimeHours}h OT</div>}
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div>Leave: {emp.approvedLeaveDays}d</div>
                        <div>Remote: {emp.remoteWorkDays}d</div>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div>{emp.siteVisitsTotal} visits ({emp.siteVisitsCompleted} done)</div>
                        <div className="text-muted-foreground">{emp.fieldDistanceKm} km</div>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div>Goals: {emp.goalsCompleted}/{emp.goalsTotal}</div>
                        <div className="text-muted-foreground">{emp.averageRating != null ? `${emp.averageRating} ★` : 'No rating'}</div>
                      </td>
                      <td className="py-3 pr-4 text-xs">
                        <div>{emp.grievancesTotal} total</div>
                        {emp.grievancesOpen > 0 && <div className="text-rose-500">{emp.grievancesOpen} open</div>}
                      </td>
                      <td className="py-3 text-xs">
                        <div className="flex flex-wrap gap-2">
                          {emp.employeeRecordId && <Link href={`/workspace/${workspaceId}/hr/${emp.employeeRecordId}`} className="text-primary hover:underline">HR Profile</Link>}
                          {emp.userId && <Link href={`/workspace/${workspaceId}/analytics/team-performance/${emp.userId}`} className="text-primary hover:underline">Task Scorecard</Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2">{data.permissions.canViewPayroll && <Card><CardContent className="p-5"><h2 className="font-semibold">Payroll totals</h2>{data.payroll.length ? <div className="mt-3 space-y-3">{data.payroll.map(row => <div key={row._id} className="rounded-lg border p-3"><div className="flex justify-between gap-3 text-sm"><span>{row._id} · {row.runs} approved/paid run(s)</span><strong>Employer cost {(row.baseAmount + row.earnings + row.employerContributions).toLocaleString()}</strong></div><p className="mt-2 text-xs text-muted-foreground">Base {row.baseAmount.toLocaleString()} · Earnings {row.earnings.toLocaleString()} · Deductions {row.deductions.toLocaleString()} · Employer contributions {row.employerContributions.toLocaleString()} · Net pay {row.netAmount.toLocaleString()}</p></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No approved payroll in the selected period.</p>}</CardContent></Card>}{data.permissions.canViewPerformance && <Card><CardContent className="p-5"><h2 className="font-semibold">Training & certifications</h2><p className="mt-2 text-sm text-muted-foreground">{data.development.overdueTrainingOrCertifications} overdue or due records through {new Date(data.period.to).toLocaleDateString()}.</p><Link href={`/workspace/${workspaceId}/hr/development`} className="mt-3 inline-block text-sm text-primary hover:underline">Review development plan records</Link><p className="mt-3 text-xs text-muted-foreground">Attendance totals include clock time that overlaps the selected dates. The <Link href={`/workspace/${workspaceId}/hr/schedules`} className="text-primary hover:underline">schedule comparison</Link> reports lateness, absences (excluding approved leave), potential overtime, and open punches.</p></CardContent></Card>}</section>
      {data.permissions.canViewPerformance && <Card><CardContent className="p-5"><h2 className="font-semibold">Goals, reviews & development progress</h2>{(data.development.byKindAndStatus || []).length ? <div className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">{(data.development.byKindAndStatus || []).map(row => <div key={`${row._id.kind}-${row._id.status}`} className="flex justify-between gap-3 border-b pb-2 text-sm"><span className="capitalize">{statusLabel(row._id.kind)} · {statusLabel(row._id.status)}</span><strong>{row.count}</strong></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">No goals, reviews, or development records yet.</p>}<Link href={`/workspace/${workspaceId}/hr/development`} className="mt-4 inline-block text-sm text-primary hover:underline">Manage goals and growth plans</Link></CardContent></Card>}</> : null}
  </main>;
}
