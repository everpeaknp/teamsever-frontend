'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Users,
  Calendar,
  TrendingUp,
  StopCircle,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ActiveTimer {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  task?: {
    _id: string;
    title: string;
    status: string;
    priority: string;
  };
  project?: {
    _id: string;
    name: string;
    color: string;
  };
  startTime: string;
  currentDuration: number;
  currentDurationFormatted: string;
  description?: string;
}

interface TimeStats {
  activeTimers: number;
  today: {
    totalDuration: number;
    totalDurationFormatted: string;
    entryCount: number;
  };
  thisWeek: {
    totalDuration: number;
    totalDurationFormatted: string;
    entryCount: number;
  };
  thisMonth: {
    totalDuration: number;
    totalDurationFormatted: string;
    entryCount: number;
  };
}

export default function TimeTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [localDurations, setLocalDurations] = useState<Record<string, number>>({});
  const [selectedTimer, setSelectedTimer] = useState<ActiveTimer | null>(null);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [stoppingTimer, setStoppingTimer] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [stoppingAllUserTimers, setStoppingAllUserTimers] = useState<string | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showStopAllDialog, setShowStopAllDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      const [activeRes, statsRes] = await Promise.all([
        api.get(`/time/admin/workspace/${workspaceId}/active`),
        api.get(`/time/admin/workspace/${workspaceId}/stats`)
      ]);

      setActiveTimers(activeRes.data.data.activeTimers || []);
      setStats(statsRes.data.data);

      // Initialize local durations
      const durations: Record<string, number> = {};
      activeRes.data.data.activeTimers?.forEach((timer: ActiveTimer) => {
        durations[timer._id] = timer.currentDuration;
      });
      setLocalDurations(durations);
    } catch (error: any) {
      console.error('Failed to fetch time tracking data:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view time tracking data');
        router.push(`/workspace/${workspaceId}/analytics`);
      } else {
        toast.error('Failed to load time tracking data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(interval);
  }, [workspaceId]);

  // Update local durations every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalDurations(prev => {
        const updated = { ...prev };
        activeTimers.forEach(timer => {
          const elapsed = Math.floor(
            (Date.now() - new Date(timer.startTime).getTime()) / 1000
          );
          updated[timer._id] = elapsed;
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimers]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleStopTimer = async () => {
    if (!selectedTimer) return;

    try {
      setStoppingTimer(true);
      await api.post(`/time/admin/stop/${selectedTimer._id}`, {
        reason: stopReason || 'Admin intervention'
      });

      toast.success(`Timer stopped for ${selectedTimer.user.name}`);
      setShowStopDialog(false);
      setSelectedTimer(null);
      setStopReason('');
      fetchData();
    } catch (error: any) {
      console.error('Failed to stop timer:', error);
      toast.error(error.response?.data?.message || 'Failed to stop timer');
    } finally {
      setStoppingTimer(false);
    }
  };

  const handleCleanupOrphaned = async () => {
    try {
      setCleaningUp(true);
      setShowCleanupDialog(false);
      const response = await api.post(`/time/admin/workspace/${workspaceId}/cleanup-orphaned`);
      
      const stoppedCount = response.data.data.stoppedCount;
      if (stoppedCount > 0) {
        toast.success(`Cleaned up ${stoppedCount} orphaned timer${stoppedCount > 1 ? 's' : ''}`);
      } else {
        toast.info('No orphaned timers found');
      }
      
      fetchData();
    } catch (error: any) {
      console.error('Failed to cleanup orphaned timers:', error);
      toast.error(error.response?.data?.message || 'Failed to cleanup orphaned timers');
    } finally {
      setCleaningUp(false);
    }
  };

  const handleStopAllUserTimers = async () => {
    if (!selectedUser) return;

    try {
      setStoppingAllUserTimers(selectedUser.id);
      setShowStopAllDialog(false);
      const response = await api.post(
        `/time/admin/workspace/${workspaceId}/stop-user-timers/${selectedUser.id}`,
        { reason: 'Admin stopped all user timers' }
      );
      
      const stoppedCount = response.data.data.stoppedCount;
      toast.success(`Stopped ${stoppedCount} timer${stoppedCount > 1 ? 's' : ''} for ${selectedUser.name}`);
      
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to stop user timers:', error);
      toast.error(error.response?.data?.message || 'Failed to stop user timers');
    } finally {
      setStoppingAllUserTimers(null);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/workspace/${workspaceId}/analytics`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Time Tracking Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Monitor team productivity and time logs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCleanupDialog(true)}
                disabled={cleaningUp}
                className="gap-2 text-orange-600 hover:text-orange-700"
              >
                {cleaningUp ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Cleanup Orphaned
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/workspace/${workspaceId}/time-tracking/timesheets`)}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                View Timesheets
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Timers</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeTimers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.today.totalDurationFormatted || '0h 0m'}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.today.entryCount || 0} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisWeek.totalDurationFormatted || '0h 0m'}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.thisWeek.entryCount || 0} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.thisMonth.totalDurationFormatted || '0h 0m'}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.thisMonth.entryCount || 0} entries
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Timers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Timers</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time view of team members currently tracking time
                </p>
              </div>
              <Badge variant="outline" className="gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activeTimers.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active timers</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Team members will appear here when they start tracking time
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTimers.map((timer) => (
                    <TableRow key={timer._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            {timer.user.avatar && <AvatarImage src={timer.user.avatar} />}
                            <AvatarFallback className="text-xs bg-blue-600 text-white">
                              {getInitials(timer.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{timer.user.name}</p>
                            <p className="text-xs text-muted-foreground">{timer.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {timer.task ? (
                          <div>
                            <p className="text-sm font-medium">{timer.task.title}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {timer.task.status}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No task</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {timer.project ? (
                          <Badge
                            style={{ backgroundColor: timer.project.color + '20', color: timer.project.color }}
                          >
                            {timer.project.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="font-mono text-sm font-medium">
                            {formatDuration(localDurations[timer._id] || timer.currentDuration)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(timer.startTime).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser({ id: timer.user._id, name: timer.user.name });
                              setShowStopAllDialog(true);
                            }}
                            disabled={stoppingAllUserTimers === timer.user._id}
                            className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            {stoppingAllUserTimers === timer.user._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <StopCircle className="w-4 h-4" />
                            )}
                            Stop All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTimer(timer);
                              setShowStopDialog(true);
                            }}
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <StopCircle className="w-4 h-4" />
                            Stop
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Stop Timer Dialog */}
      <Dialog open={showStopDialog} onOpenChange={setShowStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
            <DialogDescription>
              You are about to stop {selectedTimer?.user.name}'s timer. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                placeholder="e.g., User forgot to clock out"
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
              />
            </div>
            {selectedTimer && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">User:</span>
                  <span className="font-medium">{selectedTimer.user.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-mono font-medium">
                    {formatDuration(localDurations[selectedTimer._id] || selectedTimer.currentDuration)}
                  </span>
                </div>
                {selectedTimer.task && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Task:</span>
                    <span className="font-medium">{selectedTimer.task.title}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStopDialog(false);
                setSelectedTimer(null);
                setStopReason('');
              }}
              disabled={stoppingTimer}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopTimer}
              disabled={stoppingTimer}
              className="gap-2"
            >
              {stoppingTimer ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Stop Timer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Orphaned Timers Dialog */}
      <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cleanup Orphaned Timers</DialogTitle>
            <DialogDescription>
              This will stop all timers that have been running for more than 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    All timers running for more than 24 hours will be automatically stopped and their duration will be calculated.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCleanupDialog(false)}
              disabled={cleaningUp}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleCleanupOrphaned}
              disabled={cleaningUp}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              {cleaningUp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Cleanup Timers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop All User Timers Dialog */}
      <Dialog open={showStopAllDialog} onOpenChange={setShowStopAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop All User Timers</DialogTitle>
            <DialogDescription>
              You are about to stop all running timers for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    All running timers for this user will be stopped immediately. This is useful when a user has multiple stuck timers.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStopAllDialog(false);
                setSelectedUser(null);
              }}
              disabled={stoppingAllUserTimers !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopAllUserTimers}
              disabled={stoppingAllUserTimers !== null}
              className="gap-2"
            >
              {stoppingAllUserTimers ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4" />
                  Stop All Timers
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
