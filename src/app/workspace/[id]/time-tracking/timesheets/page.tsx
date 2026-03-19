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
  ArrowLeft,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

interface UserSummary {
  user: User;
  totalDuration: number;
  totalDurationFormatted: string;
  entryCount: number;
  projectCount: number;
}

interface ProjectSummary {
  project: Project;
  totalDuration: number;
  totalDurationFormatted: string;
  entryCount: number;
  userCount: number;
}

interface TimeEntry {
  _id: string;
  task?: {
    _id: string;
    title: string;
    status: string;
  };
  project?: Project;
  startTime: string;
  endTime: string;
  duration: number;
  durationFormatted: string;
  description?: string;
}

interface TimesheetData {
  summary: {
    totalDuration: number;
    totalDurationFormatted: string;
    totalUsers: number;
    totalProjects: number;
  };
  byUser: UserSummary[];
  byProject: ProjectSummary[];
  detailedEntries: TimeEntry[] | null;
}

export default function TimesheetsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TimesheetData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Set default date range (last 7 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedUserId) params.append('userId', selectedUserId);
      if (selectedProjectId) params.append('projectId', selectedProjectId);

      const response = await api.get(
        `/time/admin/workspace/${workspaceId}/timesheets?${params.toString()}`
      );

      setData(response.data.data);
    } catch (error: any) {
      console.error('Failed to fetch timesheets:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view timesheets');
        router.push(`/workspace/${workspaceId}/time-tracking`);
      } else {
        toast.error('Failed to load timesheets');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchTimesheets();
    }
  }, [workspaceId, startDate, endDate, selectedUserId, selectedProjectId]);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleDateRangePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  if (loading && !data) {
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
                onClick={() => router.push(`/workspace/${workspaceId}/time-tracking`)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Team Timesheets</h1>
                <p className="text-sm text-muted-foreground">
                  View detailed time tracking reports
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTimesheets}
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Presets */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Select</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDateRangePreset(7)}
                    className="flex-1"
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDateRangePreset(30)}
                    className="flex-1"
                  >
                    Last 30 Days
                  </Button>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUserId('');
                    setSelectedProjectId('');
                    handleDateRangePreset(7);
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalDurationFormatted}</div>
                <p className="text-xs text-muted-foreground">
                  Across all team members
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Active contributors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalProjects}</div>
                <p className="text-xs text-muted-foreground">
                  With time tracked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected period
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time by User */}
        {data && data.byUser.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Time by Team Member</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Total Time</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Projects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byUser.map((userSummary) => (
                    <TableRow key={userSummary.user._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            {userSummary.user.avatar && <AvatarImage src={userSummary.user.avatar} />}
                            <AvatarFallback className="text-xs bg-blue-600 text-white">
                              {getInitials(userSummary.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{userSummary.user.name}</p>
                            <p className="text-xs text-muted-foreground">{userSummary.user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{userSummary.totalDurationFormatted}</span>
                      </TableCell>
                      <TableCell>{userSummary.entryCount}</TableCell>
                      <TableCell>{userSummary.projectCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Time by Project */}
        {data && data.byProject.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Time by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Total Time</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Contributors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProject.map((projectSummary) => (
                    <TableRow key={projectSummary.project._id}>
                      <TableCell>
                        <Badge
                          style={{
                            backgroundColor: projectSummary.project.color + '20',
                            color: projectSummary.project.color
                          }}
                        >
                          {projectSummary.project.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{projectSummary.totalDurationFormatted}</span>
                      </TableCell>
                      <TableCell>{projectSummary.entryCount}</TableCell>
                      <TableCell>{projectSummary.userCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {data && data.byUser.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No time entries found for the selected period</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your date range or filters
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
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
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
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
      </main>
    </div>
  );
}
