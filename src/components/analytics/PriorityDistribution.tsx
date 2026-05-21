'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface PriorityDistributionProps {
  stats: {
    high: {
      total: number;
      done: number;
      completionRate: number;
      deadlineSuccess: number;
      delayedOpen: number;
    };
    medium: {
      total: number;
      done: number;
      completionRate: number;
      deadlineSuccess: number;
      delayedOpen: number;
    };
    low: {
      total: number;
      done: number;
      completionRate: number;
      deadlineSuccess: number;
      delayedOpen: number;
    };
  };
}

export function PriorityDistribution({ stats }: PriorityDistributionProps) {
  const rows = [
    {
      key: "high",
      label: "High Priority",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      wrapper: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30",
      labelClass: "text-red-700 dark:text-red-400",
      valueClass: "text-red-700 dark:text-red-400",
      data: stats.high
    },
    {
      key: "medium",
      label: "Medium Priority",
      icon: <TrendingUp className="w-5 h-5 text-amber-500" />,
      wrapper: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30",
      labelClass: "text-amber-700 dark:text-amber-400",
      valueClass: "text-amber-700 dark:text-amber-400",
      data: stats.medium
    },
    {
      key: "low",
      label: "Low Priority",
      icon: <TrendingDown className="w-5 h-5 text-emerald-500" />,
      wrapper: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30",
      labelClass: "text-emerald-700 dark:text-emerald-400",
      valueClass: "text-emerald-700 dark:text-emerald-400",
      data: stats.low
    }
  ] as const;

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Priority Distribution</h4>
      </div>
      <CardContent className="p-6 space-y-4">
        {rows.map((row) => (
          <div
            key={row.key}
            className={`p-4 rounded-lg border ${
              row.data.total === 0
                ? 'bg-muted/20 border-border/60'
                : row.wrapper
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {row.icon}
                <span
                  className={`text-sm font-bold ${
                    row.data.total === 0 ? 'text-muted-foreground' : row.labelClass
                  }`}
                >
                  {row.label}
                </span>
              </div>
              <span
                className={`text-lg font-bold ${
                  row.data.total === 0 ? 'text-muted-foreground' : row.valueClass
                }`}
              >
                {row.data.total}
              </span>
            </div>
            {row.data.total === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">
                No active {row.label.toLowerCase()} tasks
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide">Done</p>
                    <p className="font-semibold text-foreground">{row.data.done}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide">Completion</p>
                    <p className="font-semibold text-foreground">{row.data.completionRate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide">On-Time</p>
                    <p className="font-semibold text-foreground">{row.data.deadlineSuccess}%</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Delayed open: <span className="font-semibold text-foreground">{row.data.delayedOpen}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
