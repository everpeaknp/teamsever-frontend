'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TaskStatusChartProps {
  stats: {
    todo: number;
    inprogress: number;
    review: number;
    done: number;
    delayed: number;
  };
  totalTasks: number;
}

const COLORS = {
  todo: '#cbd5e1',
  inprogress: '#ec5b13',
  review: '#f59e0b',
  done: '#10b981',
  delayed: '#ef4444',
};

function TaskStatusTooltip({ active, payload, totalTasks }: any) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const name = String(entry?.name ?? '');
  const value = Number(entry?.value ?? 0);
  const percent = totalTasks > 0 ? ((value / totalTasks) * 100).toFixed(1) : '0.0';

  return (
    <div className="rounded-md border bg-background/95 text-foreground shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold">{name}</p>
      <p>{value} tasks ({percent}%)</p>
    </div>
  );
}

export function TaskStatusChart({ stats, totalTasks }: TaskStatusChartProps) {
  const data = [
    { name: 'To Do', value: stats.todo, color: COLORS.todo },
    { name: 'In Progress', value: stats.inprogress, color: COLORS.inprogress },
    { name: 'Review', value: stats.review, color: COLORS.review },
    { name: 'Done', value: stats.done, color: COLORS.done },
    { name: 'Delayed', value: stats.delayed, color: COLORS.delayed },
  ];

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Task Status</h4>
      </div>
      <CardContent className="pt-6 flex flex-col">
        <div className="flex-grow flex items-center justify-center relative py-2">
          <ResponsiveContainer width="100%" height={208}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={88}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<TaskStatusTooltip totalTasks={totalTasks} />}
                cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
                wrapperStyle={{ zIndex: 1000 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-extrabold">{totalTasks}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Total Tasks
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-emerald-400 leading-tight">{stats.done}</p>
          </div>
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">In Progress</p>
            <p className="text-xl font-bold text-orange-400 leading-tight">{stats.inprogress}</p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Delayed</p>
            <p className="text-xl font-bold text-red-400 leading-tight">{stats.delayed}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-border/60">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></span>
              <span className="text-xs text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
