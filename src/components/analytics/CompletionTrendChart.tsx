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
    // Get last 4 weeks of data
    const weeks = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 7));
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      
      const weekTasks = tasks.filter(t => {
        if (!t.createdAt) return false;
        const createdAt = new Date(t.createdAt);
        return createdAt >= weekStart && createdAt <= weekEnd;
      });
      
      const completed = weekTasks.filter(t => t.status === 'done').length;
      
      weeks.push({
        name: `Week ${4 - i}`,
        created: weekTasks.length,
        completed: completed,
      });
    }
    
    return weeks;
  }, [tasks]);

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Completion Trend</h4>
        <p className="text-xs text-muted-foreground">Tasks Created vs. Completed</p>
      </div>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#ec5b13" 
              strokeWidth={3}
              dot={{ fill: '#ec5b13', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="created" 
              stroke="#cbd5e1" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#cbd5e1', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
