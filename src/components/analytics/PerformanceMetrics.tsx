'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

interface PerformanceMetrics {
  totalTasksFinished: number;
  completionRate?: number | null;
  assignedTasksTotal?: number;
  assignedTasksDone?: number;
  averageTimePerTask: number;
  deadlineSuccessRate: number;
  tasksWithDeadline?: number;
  tasksMetDeadline?: number;
  delayedOpenTasks?: number;
  completedLateTasks?: number;
  totalDelayedTasks?: number;
  performanceNote: string;
}

interface TeamMember {
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  metrics: PerformanceMetrics;
}

interface PerformanceMetricsProps {
  workspaceId: string;
  userId: string;
  canViewTeamPerformance?: boolean;
  initialMyMetrics?: PerformanceMetrics | null;
  initialTeamMetrics?: TeamMember[];
}

export function PerformanceMetrics({
  workspaceId,
  userId,
  canViewTeamPerformance = false,
  initialMyMetrics = null,
  initialTeamMetrics = []
}: PerformanceMetricsProps) {
  const router = useRouter();
  const [myMetrics, setMyMetrics] = useState<PerformanceMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialMyMetrics) {
      setMyMetrics(initialMyMetrics);
      setTeamMetrics(canViewTeamPerformance ? initialTeamMetrics : []);
      setLoading(false);
      if (canViewTeamPerformance && initialTeamMetrics.length === 0) {
        fetchPerformanceData(false);
      }
      return;
    }
    fetchPerformanceData(true);
  }, [workspaceId, userId, canViewTeamPerformance, initialMyMetrics, initialTeamMetrics]);

  const fetchPerformanceData = async (includeMyPerformance = true) => {
    try {
      setLoading(true);
      const requests: Promise<any>[] = [];
      if (includeMyPerformance) {
        requests.push(api.get(`/performance/me/workspace/${workspaceId}`));
      }
      if (canViewTeamPerformance) {
        requests.push(api.get(`/performance/team/workspace/${workspaceId}`));
      }

      const responses = await Promise.all(requests);
      let responseIndex = 0;
      if (includeMyPerformance) {
        setMyMetrics(responses[responseIndex]?.data?.data || null);
        responseIndex += 1;
      }
      if (canViewTeamPerformance) {
        setTeamMetrics(responses[responseIndex]?.data?.data || []);
      } else {
        setTeamMetrics([]);
      }
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (rate: number) => {
    if (rate > 80) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
    if (rate >= 60) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const getPerformanceIcon = (rate: number) => {
    if (rate > 80) return <CheckCircle2 className="w-4 h-4" />;
    if (rate >= 60) return <TrendingUp className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const focusDelayedTasks = () => {
    router.push(`/workspace/${workspaceId}/analytics?focus=delayed-open#your-assigned-work`);
    window.dispatchEvent(new CustomEvent('focusDelayedOpenTasks'));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const previewTeamMembers = [...teamMetrics]
    .sort((a, b) => {
      const successDiff = (b.metrics?.deadlineSuccessRate || 0) - (a.metrics?.deadlineSuccessRate || 0);
      if (successDiff !== 0) return successDiff;
      return (b.metrics?.totalTasksFinished || 0) - (a.metrics?.totalTasksFinished || 0);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* My Performance */}
      {myMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Your Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Tasks Finished */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Tasks Finished</span>
                </div>
                <p className="text-2xl font-bold">{myMetrics.totalTasksFinished}</p>
              </div>

              {/* Completion Rate */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                </div>
                <p className="text-2xl font-bold">
                  {typeof myMetrics.completionRate === 'number' ? `${myMetrics.completionRate}%` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {myMetrics.assignedTasksDone ?? 0}/{myMetrics.assignedTasksTotal ?? 0} assigned done
                </p>
              </div>

              {/* Success Rate */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">Deadline Success</span>
                </div>
                <p className="text-2xl font-bold">{myMetrics.deadlineSuccessRate}%</p>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">On-Time Completions</span>
                </div>
                <p className="text-2xl font-bold">
                  {myMetrics.tasksMetDeadline ?? 0}/{myMetrics.tasksWithDeadline ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  met deadline / had deadline
                </p>
              </div>
              <button
                type="button"
                onClick={focusDelayedTasks}
                className="p-4 rounded-lg border bg-card hover:border-amber-400/60 hover:bg-amber-500/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-muted-foreground">Delayed Open Tasks</span>
                </div>
                <p className="text-2xl font-bold">{myMetrics.delayedOpenTasks ?? 0}</p>
              </button>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-muted-foreground">Total Delayed (Lifetime)</span>
                </div>
                <p className="text-2xl font-bold">{myMetrics.totalDelayedTasks ?? (myMetrics.delayedOpenTasks ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(myMetrics.completedLateTasks ?? 0)} completed late
                </p>
              </div>
            </div>

            {/* Success Rate Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Deadline Success Rate</span>
                <span className="text-sm font-bold">{myMetrics.deadlineSuccessRate}%</span>
              </div>
              <Progress value={myMetrics.deadlineSuccessRate} className="h-2" />
            </div>

            {/* Performance Note */}
            <div className={`p-4 rounded-lg flex items-start gap-3 ${getPerformanceColor(myMetrics.deadlineSuccessRate)}`}>
              {getPerformanceIcon(myMetrics.deadlineSuccessRate)}
              <p className="text-sm font-medium flex-1">{myMetrics.performanceNote}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Performance (privileged only) */}
      {canViewTeamPerformance && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Team Performance
            </CardTitle>
            <button
              type="button"
              onClick={() => router.push(`/workspace/${workspaceId}/analytics/team-performance`)}
              className="text-sm font-medium text-primary hover:underline"
            >
              View More
            </button>
          </CardHeader>
          <CardContent>
            {previewTeamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No performance data available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previewTeamMembers.map((member) => (
                  <div key={member.user._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={member.user} className="w-9 h-9 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.metrics.totalTasksFinished} done • {member.metrics.deadlineSuccessRate ?? 0}% on-time
                        </p>
                      </div>
                    </div>
                    <Badge className={getPerformanceColor(member.metrics.deadlineSuccessRate)}>
                      {member.metrics.deadlineSuccessRate}% success
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
