'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, AlertCircle, Clock3, Target, Download } from 'lucide-react';

interface TeamMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  metrics: {
    totalTasksFinished: number;
    completionRate?: number | null;
    assignedTasksTotal?: number;
    assignedTasksDone?: number;
    averageTimePerTask: number;
    deadlineSuccessRate: number;
    delayedOpenTasks?: number;
    completedLateTasks?: number;
    totalDelayedTasks?: number;
  };
}

function formatSecondsToReadable(seconds: number) {
  if (!seconds || seconds <= 0) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

type RangeKey = '7d' | '30d' | '90d' | 'custom' | 'all';

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

export default function TeamPerformanceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [teamMetrics, setTeamMetrics] = useState<TeamMember[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { from, to } = getPresetDates(range, customFrom, customTo);
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const qs = params.toString();
        const res = await api.get(`/performance/team/workspace/${workspaceId}${qs ? `?${qs}` : ''}`);
        setTeamMetrics(res.data?.data || []);
      } catch (error: any) {
        if (error?.response?.status === 403) {
          router.push(`/workspace/${workspaceId}/analytics`);
          return;
        }
        console.error('Failed to load team performance details:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId, router, range, customFrom, customTo]);

  const summary = useMemo(() => {
    const members = teamMetrics.length;
    const withAssignedScope = teamMetrics.filter((row) => typeof row.metrics.completionRate === 'number');
    const avgCompletion = withAssignedScope.length > 0
      ? Math.round(withAssignedScope.reduce((sum, row) => sum + (row.metrics.completionRate || 0), 0) / withAssignedScope.length)
      : 0;
    const avgDeadlineSuccess = members > 0
      ? Math.round(teamMetrics.reduce((sum, row) => sum + (row.metrics.deadlineSuccessRate || 0), 0) / members)
      : 0;
    const totalDone = teamMetrics.reduce((sum, row) => sum + (row.metrics.totalTasksFinished || 0), 0);
    return { members, avgCompletion, avgDeadlineSuccess, totalDone };
  }, [teamMetrics]);

  const exportRows = useMemo(() => {
    return teamMetrics.map((member) => {
      const m = member.metrics;
      return {
        name: member.user.name,
        email: member.user.email,
        tasksDone: m.totalTasksFinished,
        assignedCompletion: typeof m.completionRate === 'number' ? `${m.completionRate}%` : 'N/A',
        assignedDone: `${m.assignedTasksDone ?? 0}/${m.assignedTasksTotal ?? 0}`,
        onTimeRate: `${m.deadlineSuccessRate}%`,
        avgTimePerTask: formatSecondsToReadable(m.averageTimePerTask),
        delayedOpen: m.delayedOpenTasks ?? 0,
        totalDelayed: m.totalDelayedTasks ?? 0,
        completedLate: m.completedLateTasks ?? 0
      };
    });
  }, [teamMetrics]);

  const exportExcel = () => {
    const summaryHeaders = ["Metric", "Value"];
    const summaryRows = [
      ["Members", String(summary.members ?? 0)],
      ["Total Tasks Done", String(summary.totalDone ?? 0)],
      ["Avg Assigned Completion", `${summary.avgCompletion ?? 0}%`],
      ["Avg Deadline Success", `${summary.avgDeadlineSuccess ?? 0}%`],
    ];

    const headers = [
      "Name",
      "Email",
      "Tasks Done",
      "Assigned Completion",
      "Assigned Done",
      "On-Time Rate",
      "Avg Time / Task",
      "Delayed Open",
      "Total Delayed",
      "Completed Late"
    ];

    const rows = exportRows.map((r) => [
      r.name,
      r.email,
      String(r.tasksDone),
      r.assignedCompletion,
      r.assignedDone,
      r.onTimeRate,
      r.avgTimePerTask,
      String(r.delayedOpen),
      String(r.totalDelayed),
      String(r.completedLate)
    ]);

    const tableHtml = `
      <h2>Team Performance Summary</h2>
      <table border="1">
        <thead><tr>${summaryHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${summaryRows
            .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
      <br/>
      <h2>Individual Performance</h2>
      <table border="1">
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows
            .map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
            .join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `team-performance-${workspaceId}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const htmlRows = exportRows
      .map(
        (r) => `
          <tr>
            <td>${r.name}</td>
            <td>${r.email}</td>
            <td>${r.tasksDone}</td>
            <td>${r.assignedCompletion}</td>
            <td>${r.assignedDone}</td>
            <td>${r.onTimeRate}</td>
            <td>${r.avgTimePerTask}</td>
            <td>${r.delayedOpen}</td>
            <td>${r.totalDelayed}</td>
            <td>${r.completedLate}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Team Performance Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #999; padding: 6px; text-align: left; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Team Performance Report</h1>
          <p>Workspace: ${workspaceId}</p>
          <h2>Summary</h2>
          <table>
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Members</td><td>${summary.members ?? 0}</td></tr>
              <tr><td>Total Tasks Done</td><td>${summary.totalDone ?? 0}</td></tr>
              <tr><td>Avg Assigned Completion</td><td>${summary.avgCompletion ?? 0}%</td></tr>
              <tr><td>Avg Deadline Success</td><td>${summary.avgDeadlineSuccess ?? 0}%</td></tr>
            </tbody>
          </table>
          <h2>Individual Performance</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Tasks Done</th>
                <th>Assigned Completion</th>
                <th>Assigned Done</th>
                <th>On-Time Rate</th>
                <th>Avg Time / Task</th>
                <th>Delayed Open</th>
                <th>Total Delayed</th>
                <th>Completed Late</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading team performance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1400px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(`/workspace/${workspaceId}/analytics`)}
              className="p-2 rounded-md border hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Team Performance Details</h1>
              <p className="text-sm text-muted-foreground">Full individual metrics for performance review</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Members</p><p className="text-xl font-bold">{summary.members}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Tasks Done</p><p className="text-xl font-bold">{summary.totalDone}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Assigned Completion</p><p className="text-xl font-bold">{summary.avgCompletion}%</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Deadline Success</p><p className="text-xl font-bold">{summary.avgDeadlineSuccess}%</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Individual Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMetrics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team performance data available yet.</p>
            ) : (
              <div className="space-y-4">
                {teamMetrics.map((member) => {
                  const m = member.metrics;
                  return (
                    <div key={member.user._id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar user={member.user} className="w-10 h-10" />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{member.user.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                          </div>
                        </div>
                        <Badge>{m.deadlineSuccessRate}% deadline success</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Tasks Done</p>
                          <p className="font-bold">{m.totalTasksFinished}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Completion</p>
                          <p className="font-bold">
                            {typeof m.completionRate === 'number' ? `${m.completionRate}%` : 'N/A'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {m.assignedTasksDone ?? 0}/{m.assignedTasksTotal ?? 0} assigned
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">On-time Rate</p>
                          <p className="font-bold">{m.deadlineSuccessRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Time / Task</p>
                          <p className="font-bold flex items-center gap-1"><Clock3 className="w-3 h-3" />{formatSecondsToReadable(m.averageTimePerTask)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Delayed Open</p>
                          <p className="font-bold text-amber-500">{m.delayedOpenTasks ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Delayed</p>
                          <p className="font-bold text-red-500">{m.totalDelayedTasks ?? 0}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" />Deadline Success</span>
                          <span className="font-semibold">{m.deadlineSuccessRate}%</span>
                        </div>
                        <Progress value={m.deadlineSuccessRate} className="h-2" />
                      </div>

                      {!!(m.completedLateTasks && m.completedLateTasks > 0) && (
                        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          {m.completedLateTasks} completed late
                        </p>
                      )}
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/workspace/${workspaceId}/analytics/team-performance/${member.user._id}`)}
                          className="text-sm text-primary hover:underline"
                        >
                          View Individual Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
