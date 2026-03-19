'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PerformanceMetrics {
  totalTasksFinished: number;
  averageTimePerTask: number;
  deadlineSuccessRate: number;
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
}

export function PerformanceMetrics({ workspaceId, userId }: PerformanceMetricsProps) {
  const [myMetrics, setMyMetrics] = useState<PerformanceMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, [workspaceId, userId]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const [myPerformanceRes, teamPerformanceRes] = await Promise.all([
        api.get(`/performance/me/workspace/${workspaceId}`),
        api.get(`/performance/team/workspace/${workspaceId}`)
      ]);

      setMyMetrics(myPerformanceRes.data.data);
      setTeamMetrics(teamPerformanceRes.data.data);
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

              {/* Success Rate */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">Deadline Success</span>
                </div>
                <p className="text-2xl font-bold">{myMetrics.deadlineSuccessRate}%</p>
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

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamMetrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No performance data available yet</p>
              <p className="text-sm mt-2">Complete tasks with deadlines to see team metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMetrics.map((member) => (
                <div
                  key={member.user._id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={member.user.avatar} alt={member.user.name} />
                      <AvatarFallback className="bg-primary text-white">
                        {member.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{member.user.name}</h4>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                        <Badge className={getPerformanceColor(member.metrics.deadlineSuccessRate)}>
                          {member.metrics.deadlineSuccessRate}% Success
                        </Badge>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Tasks Done</p>
                          <p className="text-sm font-bold">{member.metrics.totalTasksFinished}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="text-sm font-bold">{member.metrics.deadlineSuccessRate}%</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <Progress value={member.metrics.deadlineSuccessRate} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
