'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriorityDistributionProps {
  stats: {
    high: number;
    medium: number;
    low: number;
  };
}

export function PriorityDistribution({ stats }: PriorityDistributionProps) {
  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Priority Distribution</h4>
      </div>
      <CardContent className="p-6 space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center justify-between border border-red-100 dark:border-red-900/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-bold text-red-700 dark:text-red-400">High Priority</span>
          </div>
          <span className="text-lg font-bold text-red-700 dark:text-red-400">{stats.high}</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg flex items-center justify-between border border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Medium Priority</span>
          </div>
          <span className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.medium}</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Low Priority</span>
          </div>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{stats.low}</span>
        </div>
      </CardContent>
    </Card>
  );
}
