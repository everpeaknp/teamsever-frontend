'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TaskStatusChartProps {
  stats: {
    todo: number;
    inprogress: number;
    review: number;
    done: number;
  };
  totalTasks: number;
}

const COLORS = {
  todo: '#cbd5e1',
  inprogress: '#ec5b13',
  review: '#f59e0b',
  done: '#10b981',
};

export function TaskStatusChart({ stats, totalTasks }: TaskStatusChartProps) {
  const data = [
    { name: 'To Do', value: stats.todo, color: COLORS.todo },
    { name: 'In Progress', value: stats.inprogress, color: COLORS.inprogress },
    { name: 'Review', value: stats.review, color: COLORS.review },
    { name: 'Done', value: stats.done, color: COLORS.done },
  ];

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Task Status</h4>
      </div>
      <CardContent className="pt-6 flex flex-col">
        <div className="flex-grow flex items-center justify-center relative py-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-extrabold">{totalTasks}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Total Tasks
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-6">
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
