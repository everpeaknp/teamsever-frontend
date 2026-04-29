'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/axios';
import {
    TrendingUp, Users, CheckCircle2, Rocket,
    Download, Calendar, BarChart3, ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/types';

// Dynamic imports for heavy chart components - reduces initial bundle size
const CompletionTrendChart = dynamic(
    () => import('@/components/analytics/CompletionTrendChart').then(mod => ({ default: mod.CompletionTrendChart })),
    { 
        ssr: false,
        loading: () => <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
    }
);

const TaskStatusChart = dynamic(
    () => import('@/components/analytics/TaskStatusChart').then(mod => ({ default: mod.TaskStatusChart })),
    { 
        ssr: false,
        loading: () => <Card><CardContent className="pt-6"><Skeleton className="h-[200px] w-full" /></CardContent></Card>
    }
);

const TeamAvailability = dynamic(
    () => import('@/components/analytics/TeamAvailability').then(mod => ({ default: mod.TeamAvailability })),
    { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const ProjectHealth = dynamic(
    () => import('@/components/analytics/ProjectHealth').then(mod => ({ default: mod.ProjectHealth })),
    { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const PriorityDistribution = dynamic(
    () => import('@/components/analytics/PriorityDistribution').then(mod => ({ default: mod.PriorityDistribution })),
    { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> }
);

const TeamPerformanceTable = dynamic(
    () => import('@/components/analytics/TeamPerformanceTable').then(mod => ({ default: mod.TeamPerformanceTable })),
    { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const ClockInOut = dynamic(
    () => import('@/components/analytics/ClockInOut').then(mod => ({ default: mod.ClockInOut })),
    { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> }
);

const YourTasks = dynamic(
    () => import('@/components/analytics/YourTasks').then(mod => ({ default: mod.YourTasks })),
    { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const Announcements = dynamic(
    () => import('@/components/analytics/Announcements').then(mod => ({ default: mod.Announcements })),
    { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const StickyNotes = dynamic(
    () => import('@/components/analytics/StickyNotes').then(mod => ({ default: mod.StickyNotes })),
    { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

const WorkspaceActivity = dynamic(
    () => import('@/components/analytics/WorkspaceActivity').then(mod => ({ default: mod.WorkspaceActivity })),
    { ssr: false, loading: () => <Skeleton className="h-[400px] w-full" /> }
);

const PerformanceMetrics = dynamic(
    () => import('@/components/analytics/PerformanceMetrics').then(mod => ({ default: mod.PerformanceMetrics })),
    { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> }
);

export default function AnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [tasks, setTasks] = useState<Task[]>([]);
    const [spaces, setSpaces] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [workspace, setWorkspace] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');
    const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('inactive');
    const [runningTimer, setRunningTimer] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [dateFilter] = useState('30'); 
    
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const CACHE_KEY = `analytics_cache_${workspaceId}`;

    // Define fetch function with useCallback so it can be passed to children safely
    const fetchAnalyticsData = useCallback(async (force = false) => {
        try {
            // If force refresh, clear the cache but don't show loading spinner
            if (force) {
                console.log('[Analytics] Force refresh - clearing cache and fetching in background');
                sessionStorage.removeItem(CACHE_KEY);
            } else {
                // Check if we have cached data in sessionStorage
                const cachedData = sessionStorage.getItem(CACHE_KEY);
                const now = Date.now();
                
                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData);
                        const cacheAge = now - parsed.timestamp;
                        
                        if (cacheAge < CACHE_DURATION) {
                            console.log('[Analytics] Using cached data from sessionStorage');
                            setTasks(parsed.tasks || []);
                            setSpaces(parsed.spaces || []);
                            setMembers(parsed.members || []);
                            setWorkspace(parsed.workspace || null);
                            setUserId(parsed.userId || '');
                            setUserStatus(parsed.userStatus || 'inactive');
                            setRunningTimer(parsed.runningTimer || null);
                            setIsAdmin(parsed.isAdmin || false);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        console.error('[Analytics] Failed to parse cached data:', e);
                        sessionStorage.removeItem(CACHE_KEY);
                    }
                }
                
                setLoading(true);
            }
            
            const localUserId = localStorage.getItem('userId') || '';
            if (localUserId) setUserId(localUserId);

            // THE GRAND UNIFIED FETCH - Single call replaces 3 parallel calls + N+1 loop
            console.log('[Analytics] Fetching unified analytics data from backend');
            const response = await api.get(`/workspaces/${workspaceId}/analytics?t=${Date.now()}`);
            const { 
                workspace: workspaceData, 
                stats: statsData, 
                hierarchy: spacesData, 
                members: membersData, 
                tasks: tasksData,
                currentRunningTimer 
            } = response.data.data;

            setMembers(membersData || []);
            setRunningTimer(currentRunningTimer || null);
            setSpaces(spacesData || []);
            setWorkspace(workspaceData || null);
            setTasks(tasksData || []);

            // Determine current user's status and admin role
            let currentUserStatus: 'active' | 'inactive' = 'inactive';
            let currentIsAdmin = false;
            
            if (localUserId) {
                // Determine Status from members array
                const currentMember = membersData?.find((m: any) => {
                    const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                    return mId === localUserId;
                });
                currentUserStatus = currentMember?.status || 'inactive';
                setUserStatus(currentUserStatus);

                // Determine Admin Privileges
                if (workspaceData) {
                    const isOwner = workspaceData.owner?._id === localUserId || workspaceData.owner === localUserId;
                    const memberRecord = workspaceData.members?.find((m: any) => {
                        const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                        return mId === localUserId;
                    });
                    const isMemberAdmin = memberRecord && (memberRecord.role === 'admin' || memberRecord.role === 'owner');
                    currentIsAdmin = isOwner || !!isMemberAdmin;
                    setIsAdmin(currentIsAdmin);
                }
            }
            
            // Cache the consolidated data
            const cacheData = {
                timestamp: Date.now(),
                tasks: tasksData,
                spaces: spacesData,
                members: membersData,
                workspace: workspaceData,
                userId: localUserId,
                userStatus: currentUserStatus,
                runningTimer: currentRunningTimer,
                isAdmin: currentIsAdmin
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        } catch (error: any) {
            console.error('Failed to fetch analytics data:', error);
            const message = error.response?.data?.message || 'Failed to load dashboard data. Please try again later.';
            import('sonner').then(({ toast }) => toast.error(message));
        } finally {
            setLoading(false);
        }
    }, [workspaceId, CACHE_DURATION, CACHE_KEY]);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    // Listen for storage events to detect cache invalidation from other tabs/components
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `${CACHE_KEY}_invalidate` && e.newValue) {
                console.log('[Analytics] Cache invalidated by external event');
                sessionStorage.removeItem(CACHE_KEY);
                sessionStorage.removeItem(`${CACHE_KEY}_invalidate`);
                // Refresh data in background without loading spinner
                fetchAnalyticsData(true);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [CACHE_KEY, fetchAnalyticsData]);

    // Listen for custom events within the same tab
    useEffect(() => {
        const handleCacheInvalidation = () => {
            console.log('[Analytics] Cache invalidated by custom event');
            sessionStorage.removeItem(CACHE_KEY);
            // Refresh data in background without loading spinner
            fetchAnalyticsData(true);
        };

        window.addEventListener('invalidateAnalyticsCache', handleCacheInvalidation);
        return () => window.removeEventListener('invalidateAnalyticsCache', handleCacheInvalidation);
    }, [CACHE_KEY, fetchAnalyticsData]);

    // Metrics calculation logic remains same but uses fixed 'members' state
    const metrics = useMemo(() => {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const clockedInMembers = members.filter(m => m.status === 'active').length;

        return {
            totalTeam: members.length,
            clockedIn: clockedInMembers,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0",
            activeProjects: spaces.filter(s => s.status === 'active').length,
        };
    }, [tasks, spaces, members]);

    const statusStats = useMemo(() => ({
        todo: tasks.filter(t => t.status === 'todo').length,
        inprogress: tasks.filter(t => t.status === 'inprogress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
    }), [tasks]);

    const priorityStats = useMemo(() => ({
        high: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
    }), [tasks]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BarChart3 className="w-12 h-12 animate-pulse text-primary mr-2" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </button>

                {/* Header Actions */}
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    {isAdmin && (
                        <Button 
                            variant="outline" 
                            className="gap-2 w-full sm:w-auto"
                            onClick={() => window.location.href = `/workspace/${workspaceId}/time-tracking`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Time Tracking
                        </Button>
                    )}
                    <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Calendar className="w-4 h-4" />
                        Last {dateFilter} Days
                    </Button>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard title="Total Team" value={metrics.totalTeam} icon={<Users className="w-5 h-5"/>} color="blue" badge={`+${metrics.clockedIn} Clocked in`} />
                    <MetricCard title="Total Tasks" value={metrics.totalTasks} icon={<CheckCircle2 className="w-5 h-5"/>} color="primary" subtext={`${metrics.completedTasks} done`} />
                    <MetricCard title="Completion Rate" value={`${metrics.completionRate}%`} icon={<TrendingUp className="w-5 h-5"/>} color="emerald" />
                    <MetricCard title="Active Projects" value={metrics.activeProjects} icon={<Rocket className="w-5 h-5"/>} color="amber" />
                </div>

                {/* Clock In & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ClockInOut
                        workspaceId={workspaceId}
                        currentStatus={userStatus}
                        runningTimer={runningTimer}
                        onStatusChange={fetchAnalyticsData}
                    />
                    <TaskStatusChart stats={statusStats} totalTasks={metrics.totalTasks} />
                    <PriorityDistribution stats={priorityStats} />
                </div>

                {/* Team & Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <TeamAvailability members={members} />
                    <div className="lg:col-span-2">
                        <YourTasks tasks={tasks} userId={userId} workspaceId={workspaceId} />
                    </div>
                </div>

                {/* Health & Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <ProjectHealth spaces={spaces} tasks={tasks} />
                    <div className="lg:col-span-2">
                        <CompletionTrendChart tasks={tasks} />
                    </div>
                </div>

                {/* Utilities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Announcements workspaceId={workspaceId} isAdmin={isAdmin} />
                    <StickyNotes workspaceId={workspaceId} userId={userId} />
                </div>

                {/* Workspace Activity Timeline */}
                <div className="mb-8">
                    <WorkspaceActivity workspaceId={workspaceId} userId={userId} />
                </div>

                {/* Performance Metrics */}
                <div className="mb-8">
                    <PerformanceMetrics workspaceId={workspaceId} userId={userId} />
                </div>
            </main>
        </div>
    );
}

// Helper component for cleaner code
function MetricCard({ title, value, icon, color, badge, subtext }: any) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-600",
        primary: "bg-primary/10 text-primary",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600"
    };
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-muted-foreground font-medium text-sm">{title}</span>
                    <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
                </div>
                <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{value}</h3>
                    {badge && <Badge className="bg-emerald-50 text-emerald-600">{badge}</Badge>}
                    {subtext && <span className="text-xs font-semibold text-emerald-500">{subtext}</span>}
                </div>
            </CardContent>
        </Card>
    );
}