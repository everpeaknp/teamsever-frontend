'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download } from 'lucide-react';

interface DetailData {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    profilePicture?: string;
  };
  metrics: {
    totalTasksFinished: number;
    completionRate?: number | null;
    assignedTasksTotal?: number;
    assignedTasksDone?: number;
    deadlineSuccessRate: number;
    delayedOpenTasks?: number;
    totalDelayedTasks?: number;
    completedLateTasks?: number;
    tasksWithDeadline?: number;
    tasksMetDeadline?: number;
  };
  taskHistory: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    deadline?: string | null;
    dueDate?: string | null;
    createdAt: string;
    updatedAt: string;
    completedAt?: string | null;
    list?: { _id: string; name: string } | null;
    space?: { _id: string; name: string } | null;
    isDelayedOpen: boolean;
    isCompletedLate: boolean;
  }>;
  commits: Array<{
    _id: string;
    description: string;
    createdAt: string;
    metadata?: Record<string, any>;
  }>;
}

function formatDate(input?: string | null) {
  if (!input) return '-';
  return new Date(input).toLocaleString();
}

function statusBadgeClass(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'done') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  if (s === 'review') return 'bg-violet-500/15 text-violet-300 border-violet-500/40';
  if (s === 'inprogress' || s === 'in-progress') return 'bg-blue-500/15 text-blue-300 border-blue-500/40';
  if (s === 'todo') return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
  if (s === 'cancelled') return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40';
  return 'bg-muted text-muted-foreground border-border';
}

function priorityBadgeClass(priority: string) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent') return 'bg-red-500/15 text-red-300 border-red-500/40';
  if (p === 'high') return 'bg-orange-500/15 text-orange-300 border-orange-500/40';
  if (p === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  if (p === 'low') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  return 'bg-muted text-muted-foreground border-border';
}

type RangeKey = '7d' | '30d' | '90d' | 'custom' | 'all';
const PRIORITY_OPTIONS = ['urgent', 'high', 'medium', 'low'] as const;
const STATUS_OPTIONS = ['todo', 'inprogress', 'review', 'done', 'cancelled'] as const;

function toLabel(value: string) {
  if (value === 'inprogress') return 'In Progress';
  if (value === 'todo') return 'To Do';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getPresetDates(range: RangeKey, customFrom: string, customTo: string) {
  if (range === 'all') return { from: '', to: '' };
  if (range === 'custom') return { from: customFrom, to: customTo };

  const now = new Date();
  const from = new Date(now);
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  from.setDate(now.getDate() - days);
  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export default function UserPerformanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DetailData | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [range, setRange] = useState<RangeKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [completedFilter, setCompletedFilter] = useState('all');
  const [flagsFilter, setFlagsFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { from, to } = getPresetDates(range, customFrom, customTo);
        const params = new URLSearchParams({ limit: '200' });
        if (from) params.set('from', from);
        if (to) params.set('to', to);

        const [detailsRes, contribRes] = await Promise.all([
          api.get(`/performance/user/${userId}/workspace/${workspaceId}/details?${params.toString()}`),
          api.get(`/performance/contributions/${userId}?workspaceId=${workspaceId}&type=all`),
        ]);
        setData(detailsRes.data?.data || null);
        setCurrentStreak(contribRes.data?.data?.currentStreak || 0);
        setLongestStreak(contribRes.data?.data?.longestStreak || 0);
      } catch (error) {
        console.error('Failed to load user performance details:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId, userId, range, customFrom, customTo]);

  const filteredTaskHistory = useMemo(() => {
    if (!data) return [];

    const now = Date.now();
    return data.taskHistory.filter((task) => {
      const normalizedPriority = String(task.priority || '').toLowerCase();
      const normalizedStatus = String(task.status || '').toLowerCase();
      const deadlineValue = task.deadline || task.dueDate;
      const deadlineTs = deadlineValue ? new Date(deadlineValue).getTime() : null;
      const isOverdue = !!deadlineTs && deadlineTs < now && normalizedStatus !== 'done' && normalizedStatus !== 'cancelled';
      const isDone = normalizedStatus === 'done';

      if (priorityFilter !== 'all' && normalizedPriority !== priorityFilter) return false;
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false;

      if (deadlineFilter === 'with') {
        if (!deadlineTs) return false;
      } else if (deadlineFilter === 'without') {
        if (deadlineTs) return false;
      } else if (deadlineFilter === 'overdue') {
        if (!isOverdue) return false;
      } else if (deadlineFilter === 'upcoming') {
        if (!deadlineTs || deadlineTs < now || isDone) return false;
      }

      if (completedFilter === 'completed' && !isDone) return false;
      if (completedFilter === 'open' && isDone) return false;

      if (flagsFilter === 'delayedOpen' && !task.isDelayedOpen) return false;
      if (flagsFilter === 'completedLate' && !task.isCompletedLate) return false;
      if (flagsFilter === 'onTime' && (task.isDelayedOpen || task.isCompletedLate)) return false;

      return true;
    });
  }, [data, priorityFilter, statusFilter, deadlineFilter, completedFilter, flagsFilter]);

  const taskCounts = useMemo(() => {
    if (!filteredTaskHistory.length) return { total: 0, done: 0, delayedOpen: 0, completedLate: 0 };
    return {
      total: filteredTaskHistory.length,
      done: filteredTaskHistory.filter((t) => String(t.status).toLowerCase() === 'done').length,
      delayedOpen: filteredTaskHistory.filter((t) => t.isDelayedOpen).length,
      completedLate: filteredTaskHistory.filter((t) => t.isCompletedLate).length,
    };
  }, [filteredTaskHistory]);

  const exportExcel = () => {
    if (!data) return;
    const kpiHeaders = ["Metric", "Value"];
    const kpiRows = [
      ["Tasks Done", String(data.metrics.totalTasksFinished ?? 0)],
      ["Assigned Completion", typeof data.metrics.completionRate === 'number' ? `${data.metrics.completionRate}%` : "N/A"],
      ["On-Time Rate", `${data.metrics.deadlineSuccessRate ?? 0}%`],
      ["Delayed Open", String(data.metrics.delayedOpenTasks ?? 0)],
      ["Current Streak", String(currentStreak)],
      ["Longest Streak", String(longestStreak)],
    ];

    const taskHeaders = ["Space Name", "List Name", "Task", "Status", "Priority", "Deadline", "Completed", "Delayed Open", "Completed Late"];
    const taskRows = filteredTaskHistory.map((t) => [
      t.space?.name || "-",
      t.list?.name || "-",
      t.title,
      t.status,
      t.priority,
      formatDate(t.deadline || t.dueDate),
      formatDate(t.completedAt),
      t.isDelayedOpen ? "Yes" : "No",
      t.isCompletedLate ? "Yes" : "No",
    ]);

    const commitHeaders = ["Commit Description", "Created At"];
    const commitRows = data.commits.map((c) => [c.description, formatDate(c.createdAt)]);

    const tableHtml = `
      <h2>${data.user.name} - Performance Summary</h2>
      <table border="1">
        <thead><tr>${kpiHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${kpiRows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      <br/>
      <h2>${data.user.name} - Task History</h2>
      <table border="1">
        <thead><tr>${taskHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${taskRows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
      <br/>
      <h2>${data.user.name} - Commit Activity</h2>
      <table border="1">
        <thead><tr>${commitHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${commitRows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `performance-${data.user.name.replace(/\s+/g, "-").toLowerCase()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!data) return;
    const kpiRows = `
      <tr><td>Tasks Done</td><td>${data.metrics.totalTasksFinished ?? 0}</td></tr>
      <tr><td>Assigned Completion</td><td>${typeof data.metrics.completionRate === 'number' ? `${data.metrics.completionRate}%` : "N/A"}</td></tr>
      <tr><td>On-Time Rate</td><td>${data.metrics.deadlineSuccessRate ?? 0}%</td></tr>
      <tr><td>Delayed Open</td><td>${data.metrics.delayedOpenTasks ?? 0}</td></tr>
      <tr><td>Current Streak</td><td>${currentStreak}</td></tr>
      <tr><td>Longest Streak</td><td>${longestStreak}</td></tr>
    `;

    const taskRows = filteredTaskHistory
      .map(
        (t) => `
          <tr>
            <td>${t.space?.name || "-"}</td><td>${t.list?.name || "-"}</td>
            <td>${t.title}</td><td>${t.status}</td><td>${t.priority}</td>
            <td>${formatDate(t.deadline || t.dueDate)}</td>
            <td>${formatDate(t.completedAt)}</td>
            <td>${t.isDelayedOpen ? "Yes" : "No"}</td>
            <td>${t.isCompletedLate ? "Yes" : "No"}</td>
          </tr>
        `
      )
      .join("");
    const commitRows = data.commits
      .map((c) => `<tr><td>${c.description}</td><td>${formatDate(c.createdAt)}</td></tr>`)
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${data.user.name} - Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1, h2 { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
            th, td { border: 1px solid #999; padding: 6px; text-align: left; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${data.user.name} - Performance Report</h1>
          <h2>Performance Summary</h2>
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>${kpiRows}</tbody>
          </table>
          <h2>Task History (Filtered)</h2>
          <table>
            <thead><tr><th>Space Name</th><th>List Name</th><th>Task</th><th>Status</th><th>Priority</th><th>Deadline</th><th>Completed</th><th>Delayed Open</th><th>Completed Late</th></tr></thead>
            <tbody>${taskRows}</tbody>
          </table>
          <h2>Commit Activity</h2>
          <table>
            <thead><tr><th>Commit Description</th><th>Created At</th></tr></thead>
            <tbody>${commitRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading individual performance...</div>;
  if (!data) return <div className="p-6 text-sm text-muted-foreground">No data found.</div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1500px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/workspace/${workspaceId}/analytics/team-performance`)}
            className="p-2 rounded-md border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <UserAvatar user={data.user} className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold">{data.user.name} — Performance Details</h1>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
          </div>
        </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangeKey)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
            {range === 'custom' && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                />
              </>
            )}
            <button
              type="button"
              onClick={exportExcel}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Tasks Done</p><p className="text-xl font-bold">{data.metrics.totalTasksFinished}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Assigned Completion</p><p className="text-xl font-bold">{typeof data.metrics.completionRate === 'number' ? `${data.metrics.completionRate}%` : 'N/A'}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">On-Time Rate</p><p className="text-xl font-bold">{data.metrics.deadlineSuccessRate}%</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Delayed Open</p><p className="text-xl font-bold">{data.metrics.delayedOpenTasks ?? 0}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Current Streak</p><p className="text-xl font-bold">{currentStreak}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Longest Streak</p><p className="text-xl font-bold">{longestStreak}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Task History ({taskCounts.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All priorities</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{toLabel(p)}</option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{toLabel(s)}</option>
                ))}
              </select>

              <select value={deadlineFilter} onChange={(e) => setDeadlineFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All deadlines</option>
                <option value="with">Has deadline</option>
                <option value="without">No deadline</option>
                <option value="overdue">Overdue open</option>
                <option value="upcoming">Upcoming</option>
              </select>

              <select value={completedFilter} onChange={(e) => setCompletedFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All completion</option>
                <option value="completed">Completed</option>
                <option value="open">Open</option>
              </select>

              <select value={flagsFilter} onChange={(e) => setFlagsFilter(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="all">All flags</option>
                <option value="delayedOpen">Delayed Open</option>
                <option value="completedLate">Completed Late</option>
                <option value="onTime">On Time</option>
              </select>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">Space Name</th>
                    <th className="py-2 pr-3">List Name</th>
                    <th className="py-2 pr-3">Task</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Deadline</th>
                    <th className="py-2 pr-3">Completed</th>
                    <th className="py-2 pr-3">Delayed Open</th>
                    <th className="py-2 pr-3">Completed Late</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaskHistory.map((t) => (
                    <tr key={t._id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                      <td className="py-3 pr-3 font-medium text-cyan-200">{t.space?.name || '-'}</td>
                      <td className="py-3 pr-3 text-sky-200">{t.list?.name || '-'}</td>
                      <td className="py-3 pr-3 font-medium">{t.title}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className={statusBadgeClass(t.status)}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className={priorityBadgeClass(t.priority)}>
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{formatDate(t.deadline || t.dueDate)}</td>
                      <td className="py-2 pr-3">{formatDate(t.completedAt)}</td>
                      <td className="py-3 pr-3">
                        <Badge
                          variant="outline"
                          className={
                            t.isDelayedOpen
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          }
                        >
                          {t.isDelayedOpen ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge
                          variant="outline"
                          className={
                            t.isCompletedLate
                              ? 'bg-red-500/15 text-red-300 border-red-500/40'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          }
                        >
                          {t.isCompletedLate ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GitHub Commit Activity ({data.commits.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.commits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No commit activity found.</p>
              ) : (
                data.commits.map((c) => (
                  <div key={c._id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
