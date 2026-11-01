'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Download, Loader2, Plus, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { loadAllHrEmployees } from '@/lib/hrEmployees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { BiometricTerminalsCard } from '@/components/hr/BiometricTerminalsCard';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dateValue = () => { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`; };
type Shift = { weekday: number; enabled: boolean; startTime: string; endTime: string; breakMinutes: number };
type Holiday = { date: string; name: string; location: string };
type Schedule = { _id: string; name: string; timezone: string; location: string; lateGraceMinutes?: number; weeklyShifts: Shift[]; holidays: Holiday[]; active: boolean; assignedEmployees: number };
type Employee = { _id: string; employeeNumber: string; user?: { name: string } };
type Assignment = { _id: string; effectiveFrom: string; effectiveTo?: string | null; reason?: string; employee?: Employee; schedule?: { _id: string; name: string }; assignedBy?: { name: string } };
type AttendanceSummary = { period: { from: string; to: string }; totals: { employees: number; scheduledMinutes: number; recordedMinutes: number; lateArrivals: number; absentDays: number; potentialOvertimeMinutes: number; openPunches: number }; employees: { employee: string; employeeNumber: string; name: string; department: string; location: string; schedules: string[]; expectedMinutes: number; recordedMinutes: number; varianceMinutes: number; attendancePercent: number | null; lateArrivals: number; absentDays: number; potentialOvertimeMinutes: number; openPunches: number; warnings: string[] }[] };
const freshShifts = (): Shift[] => weekdays.map((_, weekday) => ({ weekday, enabled: weekday >= 1 && weekday <= 5, startTime: '09:00', endTime: '17:00', breakMinutes: 60 }));
const formatHours = (minutes: number) => `${minutes < 0 ? '-' : ''}${Math.floor(Math.abs(minutes) / 60)}h ${Math.abs(minutes) % 60}m`;

export default function HrSchedulesPage() {
  const workspaceId = useParams().id as string;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [summaryRange, setSummaryRange] = useState(() => ({ from: `${dateValue().slice(0, 7)}-01`, to: dateValue() }));
  const [scheduleForm, setScheduleForm] = useState({ name: '', timezone: 'Asia/Kathmandu', location: '', lateGraceMinutes: 5 });
  const [shifts, setShifts] = useState<Shift[]>(freshShifts);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidayDraft, setHolidayDraft] = useState({ date: '', name: '', location: '' });
  const [assignmentForm, setAssignmentForm] = useState({ employeeId: '', scheduleId: '', effectiveFrom: dateValue(), reason: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [scheduleResult, employeeResult, assignmentResult] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/hr/schedules`),
        loadAllHrEmployees<Employee>(workspaceId),
        api.get(`/workspaces/${workspaceId}/hr/schedule-assignments`),
      ]);
      setSchedules(scheduleResult.data.data || []);
      setEmployees(employeeResult);
      setAssignments(assignmentResult.data.data || []);
      if (scheduleResult.data.workspaceTimezone) setScheduleForm(current => current.name ? current : { ...current, timezone: scheduleResult.data.workspaceTimezone });
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not load schedules'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [workspaceId]);

  const createSchedule = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/schedules`, { ...scheduleForm, weeklyShifts: shifts, holidays });
      toast.success('Work schedule created'); setScheduleForm(current => ({ ...current, name: '', location: '' })); setShifts(freshShifts()); setHolidays([]); setHolidayDraft({ date: '', name: '', location: '' }); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not create schedule'); }
    finally { setSaving(false); }
  };
  const assignSchedule = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post(`/workspaces/${workspaceId}/hr/schedule-assignments`, assignmentForm);
      toast.success('Schedule assigned'); setAssignmentForm(current => ({ ...current, employeeId: '', reason: '' })); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || 'Could not assign schedule'); }
    finally { setSaving(false); }
  };
  const toggleSchedule = async (schedule: Schedule) => {
    try { await api.patch(`/workspaces/${workspaceId}/hr/schedules/${schedule._id}`, { active: !schedule.active }); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not update schedule'); }
  };
  const endAssignment = async (assignment: Assignment) => {
    const effectiveTo = window.prompt('Last day on this schedule (YYYY-MM-DD)', dateValue());
    if (!effectiveTo) return;
    try { await api.patch(`/workspaces/${workspaceId}/hr/schedule-assignments/${assignment._id}/end`, { effectiveTo }); toast.success('Schedule assignment ended'); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not end schedule assignment'); }
  };
  const loadAttendanceSummary = async (event: FormEvent) => {
    event.preventDefault(); setSummaryLoading(true);
    try { const response = await api.get(`/workspaces/${workspaceId}/hr/schedule-attendance`, { params: summaryRange }); setSummary(response.data.data); }
    catch (error: any) { toast.error(error?.response?.data?.message || 'Could not compare schedules with attendance'); }
    finally { setSummaryLoading(false); }
  };
  const exportAttendanceSummary = () => {
    if (!summary) return;
    const rows: Array<Array<string | number>> = [
      ['Employee', 'Employee number', 'Department', 'Location', 'Schedules', 'Scheduled minutes', 'Recorded minutes', 'Variance minutes', 'Coverage %', 'Late arrivals', 'Absent days', 'Potential overtime minutes', 'Open punches', 'Warnings'],
      ...summary.employees.map(employee => [employee.name, employee.employeeNumber, employee.department, employee.location, employee.schedules.join('; '), employee.expectedMinutes, employee.recordedMinutes, employee.varianceMinutes, employee.attendancePercent ?? '', employee.lateArrivals, employee.absentDays, employee.potentialOvertimeMinutes, employee.openPunches, employee.warnings.join('; ')]),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `attendance-comparison-${summary.period.from}-to-${summary.period.to}.csv`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <Link href={`/workspace/${workspaceId}/hr`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Human Resources</Link>
    <header className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><CalendarDays className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">Work schedules</h1><p className="mt-1 text-sm text-muted-foreground">Set weekly shifts and holidays, then assign employees with effective dates. Clock-in and leave remain in Attendance.</p></div></header>
    <BiometricTerminalsCard workspaceId={workspaceId} />
    <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Create a schedule</h2><p className="text-sm text-muted-foreground">Times use the selected timezone. Overnight shifts are supported.</p></div><form onSubmit={createSchedule} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-sm font-medium">Schedule name<Input required value={scheduleForm.name} onChange={event => setScheduleForm({ ...scheduleForm, name: event.target.value })} placeholder="e.g. Kathmandu office" /></label><label className="space-y-1 text-sm font-medium">Timezone<Input required value={scheduleForm.timezone} onChange={event => setScheduleForm({ ...scheduleForm, timezone: event.target.value })} placeholder="Asia/Kathmandu" /></label><label className="space-y-1 text-sm font-medium">Location (optional)<Input value={scheduleForm.location} onChange={event => setScheduleForm({ ...scheduleForm, location: event.target.value })} /></label><label className="space-y-1 text-sm font-medium">Late grace (minutes)<Input type="number" min="0" max="120" step="1" required value={scheduleForm.lateGraceMinutes} onChange={event => setScheduleForm({ ...scheduleForm, lateGraceMinutes: Number(event.target.value) })} /><span className="text-xs text-muted-foreground">0 to 120 minutes</span></label></div>
      <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[660px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Day</th><th className="p-3">Work day</th><th className="p-3">Start</th><th className="p-3">End</th><th className="p-3">Break (min)</th></tr></thead><tbody className="divide-y">{shifts.map(shift => <tr key={shift.weekday}><td className="p-3 font-medium">{weekdays[shift.weekday]}</td><td className="p-3"><input type="checkbox" aria-label={`${weekdays[shift.weekday]} is a work day`} checked={shift.enabled} onChange={event => setShifts(current => current.map(item => item.weekday === shift.weekday ? { ...item, enabled: event.target.checked } : item))} /></td><td className="p-2"><Input type="time" disabled={!shift.enabled} value={shift.startTime} onChange={event => setShifts(current => current.map(item => item.weekday === shift.weekday ? { ...item, startTime: event.target.value } : item))} /></td><td className="p-2"><Input type="time" disabled={!shift.enabled} value={shift.endTime} onChange={event => setShifts(current => current.map(item => item.weekday === shift.weekday ? { ...item, endTime: event.target.value } : item))} /></td><td className="p-2"><Input type="number" min="0" max="720" disabled={!shift.enabled} value={shift.breakMinutes} onChange={event => setShifts(current => current.map(item => item.weekday === shift.weekday ? { ...item, breakMinutes: Number(event.target.value) } : item))} /></td></tr>)}</tbody></table></div>
      <div className="space-y-3 rounded-lg border p-3"><h3 className="text-sm font-semibold">Holiday dates</h3><div className="grid gap-3 sm:grid-cols-4"><label className="space-y-1 text-sm font-medium">Date<Input type="date" value={holidayDraft.date} onChange={event => setHolidayDraft({ ...holidayDraft, date: event.target.value })} /></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Holiday name<Input value={holidayDraft.name} onChange={event => setHolidayDraft({ ...holidayDraft, name: event.target.value })} placeholder="e.g. Public holiday" /></label><label className="space-y-1 text-sm font-medium">Location (optional)<Input value={holidayDraft.location} onChange={event => setHolidayDraft({ ...holidayDraft, location: event.target.value })} /></label></div><Button type="button" variant="outline" disabled={!holidayDraft.date || !holidayDraft.name.trim()} onClick={() => { if (holidays.some(item => item.date === holidayDraft.date && item.location.trim().toLowerCase() === holidayDraft.location.trim().toLowerCase())) { toast.error('That holiday date and location is already on this schedule'); return; } setHolidays(current => [...current, holidayDraft].sort((a, b) => a.date.localeCompare(b.date))); setHolidayDraft({ date: '', name: '', location: '' }); }}>Add holiday</Button>{holidays.length > 0 && <ul className="divide-y rounded-lg border">{holidays.map((item, index) => <li key={`${item.date}-${item.location}-${index}`} className="flex flex-wrap items-center justify-between gap-2 p-2 text-sm"><span>{item.date} · {item.name}{item.location ? ` · ${item.location}` : ''}</span><Button type="button" size="sm" variant="ghost" onClick={() => setHolidays(current => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></li>)}</ul>}</div>
      <Button disabled={saving}><Plus className="mr-2 h-4 w-4" />Save schedule</Button>
    </form></CardContent></Card>
    <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Assign a schedule</h2><p className="text-sm text-muted-foreground">A new assignment closes the previous one the day before it starts, preserving history.</p></div><form onSubmit={assignSchedule} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-sm font-medium">Employee<select required value={assignmentForm.employeeId} onChange={event => setAssignmentForm({ ...assignmentForm, employeeId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choose employee</option>{employees.map(employee => <option key={employee._id} value={employee._id}>{employee.user?.name || 'Employee'} · {employee.employeeNumber}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Schedule<select required value={assignmentForm.scheduleId} onChange={event => setAssignmentForm({ ...assignmentForm, scheduleId: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choose schedule</option>{schedules.filter(schedule => schedule.active).map(schedule => <option key={schedule._id} value={schedule._id}>{schedule.name}{schedule.location ? ` · ${schedule.location}` : ''}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Effective from<Input required type="date" value={assignmentForm.effectiveFrom} onChange={event => setAssignmentForm({ ...assignmentForm, effectiveFrom: event.target.value })} /></label><label className="space-y-1 text-sm font-medium">Reason (optional)<Input value={assignmentForm.reason} onChange={event => setAssignmentForm({ ...assignmentForm, reason: event.target.value })} /></label><Button disabled={saving || !schedules.some(schedule => schedule.active)} className="sm:col-span-2 lg:col-span-4">Assign schedule</Button></form></CardContent></Card>
    <Card><CardContent className="space-y-4 p-5"><div><h2 className="text-lg font-semibold">Scheduled vs recorded attendance</h2><p className="text-sm text-muted-foreground">Uses assigned shift times and recorded punches. Approved leave and holidays are excluded. Absence is counted only after the shift ends; overtime is a review flag, not an approval. Open punches are clock-ins without a clock-out yet.</p></div><form onSubmit={loadAttendanceSummary} className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm font-medium">From<Input required type="date" value={summaryRange.from} onChange={event => setSummaryRange({ ...summaryRange, from: event.target.value })} /></label><label className="space-y-1 text-sm font-medium">To<Input required type="date" value={summaryRange.to} onChange={event => setSummaryRange({ ...summaryRange, to: event.target.value })} /></label><Button disabled={summaryLoading}>{summaryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Compare attendance</Button><Link href={`/workspace/${workspaceId}/hr/attendance-corrections`} className="text-sm text-primary hover:underline">Review correction requests</Link></form>{summary && <><div className="flex flex-wrap justify-end"><Button type="button" variant="outline" onClick={exportAttendanceSummary}><Download className="mr-2 h-4 w-4" />Export comparison CSV</Button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Employees</p><p className="text-xl font-semibold">{summary.totals.employees}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Late arrivals</p><p className="text-xl font-semibold">{summary.totals.lateArrivals}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Absent days</p><p className="text-xl font-semibold">{summary.totals.absentDays}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Potential overtime</p><p className="text-xl font-semibold">{formatHours(summary.totals.potentialOvertimeMinutes)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Open punches</p><p className="text-xl font-semibold">{summary.totals.openPunches}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Scheduled time</p><p className="text-xl font-semibold">{formatHours(summary.totals.scheduledMinutes)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Recorded time</p><p className="text-xl font-semibold">{formatHours(summary.totals.recordedMinutes)}</p></div></div><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[1100px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Employee</th><th className="p-3">Schedule</th><th className="p-3">Expected</th><th className="p-3">Recorded</th><th className="p-3">Difference</th><th className="p-3">Coverage</th><th className="p-3">Late</th><th className="p-3">Absent</th><th className="p-3">Overtime</th><th className="p-3">Open punches</th></tr></thead><tbody className="divide-y">{summary.employees.map(employee => <tr key={employee.employee}><td className="p-3">{employee.name} · {employee.employeeNumber}{employee.department ? <span className="block text-xs text-muted-foreground">{employee.department}</span> : null}</td><td className="p-3">{employee.schedules.length ? employee.schedules.join(', ') : <span className="text-amber-700">No schedule</span>}</td><td className="p-3">{formatHours(employee.expectedMinutes)}</td><td className="p-3">{formatHours(employee.recordedMinutes)}</td><td className={`p-3 ${employee.varianceMinutes < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{employee.varianceMinutes > 0 ? '+' : ''}{formatHours(employee.varianceMinutes)}</td><td className="p-3">{employee.attendancePercent == null ? '—' : `${employee.attendancePercent}%`}</td><td className="p-3">{employee.lateArrivals}</td><td className="p-3">{employee.absentDays}</td><td className="p-3">{formatHours(employee.potentialOvertimeMinutes)}</td><td className="p-3">{employee.openPunches}</td></tr>)}</tbody></table></div></>}</CardContent></Card>
    {loading ? <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading schedules</div> : <>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Schedule policies</h2>{schedules.length ? schedules.map(schedule => <Card key={schedule._id}><CardContent className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{schedule.name}</h3><p className="text-sm text-muted-foreground">{schedule.timezone}{schedule.location ? ` · ${schedule.location}` : ''} · {schedule.assignedEmployees} current assignments · {schedule.lateGraceMinutes ?? 5}m late grace</p></div><Button size="sm" variant="outline" onClick={() => void toggleSchedule(schedule)}>{schedule.active ? 'Deactivate' : 'Reactivate'}</Button></div><div className="flex flex-wrap gap-2">{schedule.weeklyShifts.filter(shift => shift.enabled).map(shift => <span key={shift.weekday} className="rounded-md bg-muted px-2 py-1 text-xs">{weekdays[shift.weekday]} {shift.startTime}–{shift.endTime} · {shift.breakMinutes}m break</span>)}{schedule.weeklyShifts.every(shift => !shift.enabled) && <span className="text-sm text-muted-foreground">No working days configured.</span>}</div>{schedule.holidays?.length > 0 && <ul className="flex flex-wrap gap-2 border-t pt-3">{schedule.holidays.map((item: any, index: number) => <li key={item._id || index} className="rounded-md border px-2 py-1 text-xs">{new Date(item.date).toLocaleDateString()} · {item.name}{item.location ? ` · ${item.location}` : ''}</li>)}</ul>}</CardContent></Card>) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No work schedules yet. Create one above.</CardContent></Card>}</section>
      <section className="space-y-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" />Assignment history</h2>{assignments.length ? <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[700px] text-sm"><thead className="bg-muted/50 text-left"><tr><th className="p-3">Employee</th><th className="p-3">Schedule</th><th className="p-3">Effective period</th><th className="p-3">Assigned by</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{assignments.map(assignment => <tr key={assignment._id}><td className="p-3">{assignment.employee?.user?.name || 'Employee'} · {assignment.employee?.employeeNumber}</td><td className="p-3">{assignment.schedule?.name || 'Schedule removed'}</td><td className="p-3">{new Date(assignment.effectiveFrom).toLocaleDateString()}{assignment.effectiveTo ? ` – ${new Date(assignment.effectiveTo).toLocaleDateString()}` : ' – Current'}</td><td className="p-3">{assignment.assignedBy?.name || '—'}</td><td className="p-3">{!assignment.effectiveTo && <Button size="sm" variant="outline" onClick={() => void endAssignment(assignment)}>End</Button>}</td></tr>)}</tbody></table></div> : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No schedule assignments have been recorded.</CardContent></Card>}</section>
    </>}
  </main>;
}
