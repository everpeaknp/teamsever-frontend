'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Task } from '@/types';

interface CompletionTrendChartProps {
  tasks: Task[];
}

export function CompletionTrendChart({ tasks }: CompletionTrendChartProps) {
  const chartData = useMemo(() => {
    // Build last 4 full 7-day buckets ending today.
    // "created" is based on createdAt, "completed" is based on completedAt.
    const weeks = [];
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      const created = tasks.filter((t) => {
        if (!t.createdAt) return false;
        const createdAt = new Date(t.createdAt);
        return createdAt >= weekStart && createdAt <= weekEnd;
      }).length;

      const completed = tasks.filter((t) => {
        if (!t.completedAt) return false;
        const completedAt = new Date(t.completedAt);
        return completedAt >= weekStart && completedAt <= weekEnd;
      }).length;

      const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      weeks.push({
        name: label,
        created,
        completed,
      });
    }

    return weeks;
  }, [tasks]);

  const summary = useMemo(() => {
    const totalCreated = chartData.reduce((acc, item) => acc + item.created, 0);
    const totalCompleted = chartData.reduce((acc, item) => acc + item.completed, 0);
    const delta = totalCompleted - totalCreated;
    return { totalCreated, totalCompleted, delta };
  }, [chartData]);

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Completion Trend</h4>
        <p className="text-xs text-muted-foreground">Weekly created vs completed (last 4 weeks)</p>
      </div>
      <CardContent className="pt-6">
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-md border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Created</p>
            <p className="text-lg font-semibold">{summary.totalCreated}</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold">{summary.totalCompleted}</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completion Delta</p>
            <p className={`text-lg font-semibold ${summary.delta >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {summary.delta >= 0 ? '+' : ''}{summary.delta}
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" allowDecimals={false} />
            <Tooltip
              formatter={(value: number | string | undefined, name: string | undefined) => {
                const normalized = String(name || '').toLowerCase();
                const label = normalized.includes('complete') ? 'Completed' : 'Created';
                return [`${Number(value || 0)} tasks`, label];
              }}
              labelFormatter={(label) => `Week: ${label}`}
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.96)',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                borderRadius: '10px',
                color: '#fff',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#ec5b13" 
              strokeWidth={3}
              name="Completed"
              dot={{ fill: '#ec5b13', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="created" 
              stroke="#cbd5e1" 
              strokeWidth={2}
              name="Created"
              strokeDasharray="5 5"
              dot={{ fill: '#cbd5e1', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
