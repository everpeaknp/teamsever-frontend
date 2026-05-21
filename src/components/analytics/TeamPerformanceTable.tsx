'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { Task } from '@/types';

interface TeamPerformanceTableProps {
  members: any[];
  tasks: Task[];
  searchQuery: string;
}

export function TeamPerformanceTable({ members, tasks, searchQuery }: TeamPerformanceTableProps) {
  const memberStats = useMemo(() => {
    return members.map(member => {
      const userId = typeof member.user === 'string' ? member.user : member.user?._id;
      const userName = typeof member.user === 'object' ? member.user?.name : 'Unknown';
      const userAvatar = typeof member.user === 'object' ? member.user?.avatar : undefined;
      
      const memberTasks = tasks.filter(t => {
        const assigneeId = typeof t.assignee === 'string' ? t.assignee : t.assignee?._id;
        return assigneeId === userId;
      });
      
      const completedTasks = memberTasks.filter(t => t.status === 'done');
      const completedCount = completedTasks.length;
      
      let avgTimeHours = 0;
      let avgTimeDisplay = 'N/A';
      
      if (completedCount > 0) {
        const totalTime = completedTasks.reduce((sum, task) => {
          if (task.createdAt && task.updatedAt) {
            const created = new Date(task.createdAt).getTime();
            const updated = new Date(task.updatedAt).getTime();
            const hours = (updated - created) / (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        }, 0);
        
        avgTimeHours = totalTime / completedCount;
        
        if (avgTimeHours < 1) {
          avgTimeDisplay = `${Math.round(avgTimeHours * 60)}m`;
        } else {
          const hours = Math.floor(avgTimeHours);
          const minutes = Math.round((avgTimeHours - hours) * 60);
          avgTimeDisplay = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
      }
      
      const performance = memberTasks.length > 0 
        ? Math.round((completedCount / memberTasks.length) * 100) 
        : 0;
      
      return {
        id: userId,
        name: userName,
        avatar: userAvatar,
        role: member.role || 'member',
        totalAssigned: memberTasks.length,
        tasksFinished: completedCount,
        avgTime: avgTimeDisplay,
        avgTimeHours,
        status: member.status || 'inactive',
        performance,
      };
    }).sort((a, b) => b.performance - a.performance || b.tasksFinished - a.tasksFinished);
  }, [members, tasks]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return memberStats;
    return memberStats.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [memberStats, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            CLOCKED IN
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            CLOCKED OUT
          </Badge>
        );
    }
  };

  const getPerformanceLabel = (performance: number) => {
    if (performance >= 90) return { label: 'Excellent', color: 'bg-emerald-500' };
    if (performance >= 70) return { label: 'Good', color: 'bg-primary' };
    if (performance >= 50) return { label: 'Average', color: 'bg-amber-500' };
    return { label: 'Needs Improvement', color: 'bg-red-500' };
  };

  const getTimePerformanceFeedback = (avgTimeHours: number) => {
    if (avgTimeHours === 0) {
      return { icon: <Minus className="w-3 h-3" />, text: 'No data', color: 'text-slate-500' };
    }
    if (avgTimeHours < 2) {
      return { icon: <TrendingUp className="w-3 h-3" />, text: 'Excellent speed', color: 'text-emerald-600' };
    }
    if (avgTimeHours >= 2 && avgTimeHours < 3) {
      return { icon: <Minus className="w-3 h-3" />, text: 'Needs improvement', color: 'text-amber-600' };
    }
    return { icon: <TrendingDown className="w-3 h-3" />, text: 'Too slow', color: 'text-red-600' };
  };

  const teamSummary = useMemo(() => {
    const totalDone = filteredMembers.reduce((sum, member) => sum + member.tasksFinished, 0);
    const totalAssigned = filteredMembers.reduce((sum, member) => sum + member.totalAssigned, 0);
    const avgPerformance = filteredMembers.length > 0
      ? Math.round(filteredMembers.reduce((sum, member) => sum + member.performance, 0) / filteredMembers.length)
      : 0;
    const activeNow = filteredMembers.filter((member) => member.status === 'active').length;
    return { totalDone, totalAssigned, avgPerformance, activeNow };
  }, [filteredMembers]);

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Team Performance Overview</h4>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-md border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Done</p>
            <p className="text-base font-semibold">{teamSummary.totalDone}</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Assigned</p>
            <p className="text-base font-semibold">{teamSummary.totalAssigned}</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Performance</p>
            <p className="text-base font-semibold">{teamSummary.avgPerformance}%</p>
          </div>
          <div className="rounded-md border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Clocked In</p>
            <p className="text-base font-semibold">{teamSummary.activeNow}</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Done / Assigned</th>
              <th className="px-6 py-4">Avg. Time / Task</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Performance Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No team members found
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, index) => {
                const perfData = getPerformanceLabel(member.performance);
                const timeFeedback = getTimePerformanceFeedback(member.avgTimeHours);
                
                return (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 text-xs font-bold text-muted-foreground">
                          {index < 3 ? <Trophy className={`w-4 h-4 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-orange-600'}`} /> : `#${index + 1}`}
                        </div>
                        <UserAvatar 
                          user={{ name: member.name, avatar: member.avatar, _id: member.id }} 
                          className="w-8 h-8" 
                        />
                        <div>
                          <p className="text-sm font-bold">{member.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {member.tasksFinished}
                      <span className="text-muted-foreground"> / {member.totalAssigned}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{member.avgTime}</span>
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${timeFeedback.color}`}>
                          {timeFeedback.icon}
                          {timeFeedback.text}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(member.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${perfData.color}`} 
                            style={{ width: `${member.performance}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-bold">{member.performance}% {perfData.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t">
        <span className="text-xs text-muted-foreground">
          Showing {filteredMembers.length} of {members.length} members
        </span>
      </div>
    </Card>
  );
}
