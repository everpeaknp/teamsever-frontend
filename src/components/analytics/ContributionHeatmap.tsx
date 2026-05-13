'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Flame, 
  Trophy, 
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { format, subDays, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContributionData {
  dailyCounts: Record<string, number>;
  currentStreak: number;
  longestStreak: number;
}

interface ContributionHeatmapProps {
  userId: string;
  workspaceId?: string;
}

export function ContributionHeatmap({ userId, workspaceId }: ContributionHeatmapProps) {
  const [data, setData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'github' | 'tasks'>('all');

  useEffect(() => {
    fetchContributions();
  }, [userId, workspaceId, filter]);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (workspaceId) queryParams.append('workspaceId', workspaceId);
      queryParams.append('type', filter);

      const url = userId === 'me' 
        ? `/performance/contributions/me?${queryParams.toString()}`
        : `/performance/contributions/${userId}?${queryParams.toString()}`;
      
      const response = await api.get(url);
      setData(response.data.data);
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
      setError('Failed to load contribution data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!data) return null;

  // Generate days for the last 12 months (roughly 52 weeks)
  const endDate = new Date();
  const startDate = subDays(endDate, 364); // 365 days total
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group days into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Align the start to the beginning of the week
  const firstDay = startOfWeek(startDate);
  const allDays = eachDayOfInterval({ start: firstDay, end: endDate });

  allDays.forEach((day, i) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || i === allDays.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getIntensity = (count: number) => {
    if (!count) return 'bg-slate-100 dark:bg-slate-800/40';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900/30';
    if (count <= 3) return 'bg-emerald-400 dark:bg-emerald-700/50';
    if (count <= 6) return 'bg-emerald-500 dark:bg-emerald-600';
    return 'bg-emerald-600 dark:bg-emerald-500';
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-[#1a1a1a]">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-[#262626]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Contribution Activity
            </CardTitle>

            {/* Filter Controls */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0a0a0a] rounded-lg border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                  filter === 'all' 
                    ? "bg-white dark:bg-[#262626] text-primary shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Combined
              </button>
              <button
                onClick={() => setFilter('github')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                  filter === 'github' 
                    ? "bg-white dark:bg-[#262626] text-primary shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                GitHub
              </button>
              <button
                onClick={() => setFilter('tasks')}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                  filter === 'tasks' 
                    ? "bg-white dark:bg-[#262626] text-primary shadow-sm ring-1 ring-black/5" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                Tasks
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-950/20 rounded-full border border-orange-100 dark:border-orange-900/30">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                {data.currentStreak} Day Streak
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-medium border-slate-200 dark:border-slate-700">
              Max: {data.longestStreak}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="relative overflow-x-auto pb-4">
          <div className="flex gap-1 min-w-max">
            {/* Day Labels */}
            <div className="flex flex-col gap-1 pr-2 text-[10px] text-slate-400 font-medium justify-between py-1 mt-6">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {/* Month Labels (only show if it's the start of a month) */}
                  <div className="h-4 text-[10px] text-slate-400 font-medium">
                    {week[0].getDate() <= 7 && format(week[0], 'MMM')}
                  </div>
                  {week.map((day, dayIdx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const count = data.dailyCounts[dateKey] || 0;
                    const isFuture = isAfter(day, new Date());

                    return (
                      <div
                        key={dateKey}
                        title={`${count} contributions on ${format(day, 'MMM d, yyyy')}`}
                        className={cn(
                          "w-3 h-3 rounded-[2px] transition-all duration-200 hover:ring-2 hover:ring-primary/20 cursor-default",
                          isFuture ? "opacity-0 pointer-events-none" : getIntensity(count)
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>Includes GitHub commits and task completions</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[1px] bg-slate-100 dark:bg-slate-800/40" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-200 dark:bg-emerald-900/30" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-400 dark:bg-emerald-700/50" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-500 dark:bg-emerald-600" />
            <div className="w-2.5 h-2.5 rounded-[1px] bg-emerald-600 dark:bg-emerald-500" />
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
