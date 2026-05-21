'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/axios';
import {
    TrendingUp, Users, CheckCircle2, Rocket,
    BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/types';
import { useRef } from 'react';

type AnalyticsView = 'workspace' | 'personal';

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
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const workspaceId = params.id as string;
    const focusMode = searchParams.get('focus');
    const isDelayedFocus = focusMode === 'delayed-open';
    const yourTasksRef = useRef<HTMLDivElement | null>(null);
    const initialView: AnalyticsView = searchParams.get('view') === 'personal' ? 'personal' : 'workspace';

    const [tasks, setTasks] = useState<Task[]>([]);
    const [spaces, setSpaces] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [workspace, setWorkspace] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [stickyNote, setStickyNote] = useState<any>(null);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [performanceData, setPerformanceData] = useState<{ user?: any; team?: any[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string>('');
    const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('inactive');
    const [runningTimer, setRunningTimer] = useState<any>(null);
    const [canViewWorkspaceAnalytics, setCanViewWorkspaceAnalytics] = useState(false);
    const [announcementPermissions, setAnnouncementPermissions] = useState({
        canViewAnnouncements: true,
        canCreateAnnouncements: false,
        canDeleteAnnouncements: false,
    });
    const [availableViews, setAvailableViews] = useState<AnalyticsView[]>(['personal']);
    const [selectedView, setSelectedView] = useState<AnalyticsView>(initialView);
    const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
    const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const backgroundRefreshDoneRef = useRef<Set<string>>(new Set());
    
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const CACHE_KEY = `analytics_cache_${workspaceId}_${selectedView}_${range}_${customFrom}_${customTo}`;

    const getPresetDates = useCallback(() => {
        if (range === 'all') return { from: '', to: '' };
        if (range === 'custom') return { from: customFrom, to: customTo };
        const now = new Date();
        const from = new Date(now);
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        from.setDate(now.getDate() - days);
        return {
            from: from.toISOString().slice(0, 10),
            to: now.toISOString().slice(0, 10),
        };
    }, [range, customFrom, customTo]);

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
                            const cachedMembers = Array.isArray(parsed.members) ? parsed.members : [];
                            const hasUsableMembers = cachedMembers.length > 0;
                            if (!hasUsableMembers) {
                                console.log('[Analytics] Cached payload missing members, fetching fresh data');
                            } else {
                            setTasks(parsed.tasks || []);
                            setSpaces(parsed.spaces || []);
                            setMembers(parsed.members || []);
                            setWorkspace(parsed.workspace || null);
                            setStats(parsed.stats || null);
                            setUserId(parsed.userId || '');
                            setUserStatus(parsed.userStatus || 'inactive');
                            setRunningTimer(parsed.runningTimer || null);
                            setCanViewWorkspaceAnalytics(parsed.canViewWorkspaceAnalytics || false);
                            setAnnouncementPermissions(parsed.announcementPermissions || {
                                canViewAnnouncements: true,
                                canCreateAnnouncements: false,
                                canDeleteAnnouncements: false,
                            });
                            setAvailableViews(parsed.availableViews || ['personal']);
                            const cachedView: AnalyticsView = parsed.selectedView === 'personal' ? 'personal' : 'workspace';
                            if (cachedView !== selectedView) {
                                setSelectedView(cachedView);
                            }
                            setAccessDeniedMessage(null);
                            setStickyNote(parsed.stickyNote || null);
                            setAnnouncements(parsed.announcements || []);
                            setRecentActivity(parsed.recentActivity || []);
                            setPerformanceData(parsed.performance || null);
                            setLoading(false);
                                if (!backgroundRefreshDoneRef.current.has(CACHE_KEY)) {
                                    backgroundRefreshDoneRef.current.add(CACHE_KEY);
                                    setTimeout(() => {
                                        fetchAnalyticsData(true);
                                    }, 0);
                                }
                            return;
                            }
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
            const { from, to } = getPresetDates();
            const query = new URLSearchParams();
            query.set('t', String(Date.now()));
            query.set('view', selectedView);
            if (from) query.set('from', from);
            if (to) query.set('to', to);
            const response = await api.get(`/workspaces/${workspaceId}/analytics?${query.toString()}`);
            const { 
                workspace: workspaceData, 
                stats: statsData, 
                hierarchy: spacesData, 
                members: membersData, 
                tasks: tasksData,
                currentRunningTimer,
                stickyNote: stickyNoteData,
                announcements: announcementsData,
                recentActivity: recentActivityData,
                performance,
                permissions,
                view
            } = response.data.data;

            setMembers(membersData || []);
            setRunningTimer(currentRunningTimer || null);
            setSpaces(spacesData || []);
            setWorkspace(workspaceData || null);
            setStats(statsData || null);
            setTasks(tasksData || []);
            setStickyNote(stickyNoteData || null);
            setAnnouncements(announcementsData || []);
            setRecentActivity(recentActivityData || []);
            setPerformanceData(performance || null);
            setAccessDeniedMessage(null);

            // Determine current user's status
            let currentUserStatus: 'active' | 'inactive' = 'inactive';
            let currentCanViewWorkspaceAnalytics = false;
            
            if (localUserId) {
                // Determine Status from members array
                const currentMember = membersData?.find((m: any) => {
                    const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                    return mId === localUserId;
                });
                currentUserStatus = currentMember?.status || 'inactive';
                setUserStatus(currentUserStatus);

            }
            currentCanViewWorkspaceAnalytics = !!view?.canViewWorkspaceAnalytics;
            setCanViewWorkspaceAnalytics(currentCanViewWorkspaceAnalytics);
            setAnnouncementPermissions({
                canViewAnnouncements: permissions?.canViewAnnouncements !== false,
                canCreateAnnouncements: !!permissions?.canCreateAnnouncements,
                canDeleteAnnouncements: !!permissions?.canDeleteAnnouncements,
            });
            const responseAvailableViews: AnalyticsView[] = Array.isArray(view?.available)
                ? view.available.filter((item: string) => item === 'workspace' || item === 'personal')
                : ['personal'];
            setAvailableViews(responseAvailableViews.length ? responseAvailableViews : ['personal']);

            const effectiveView: AnalyticsView = view?.effective === 'workspace' ? 'workspace' : 'personal';
            if (effectiveView !== selectedView) {
                setSelectedView(effectiveView);
            }
            
            // Cache the consolidated data
            const cacheData = {
                timestamp: Date.now(),
                tasks: tasksData,
                spaces: spacesData,
                members: membersData,
                workspace: workspaceData,
                stats: statsData,
                userId: localUserId,
                userStatus: currentUserStatus,
                runningTimer: currentRunningTimer,
                canViewWorkspaceAnalytics: currentCanViewWorkspaceAnalytics,
                announcementPermissions: {
                    canViewAnnouncements: permissions?.canViewAnnouncements !== false,
                    canCreateAnnouncements: !!permissions?.canCreateAnnouncements,
                    canDeleteAnnouncements: !!permissions?.canDeleteAnnouncements,
                },
                availableViews: responseAvailableViews,
                selectedView: effectiveView,
                stickyNote: stickyNoteData,
                announcements: announcementsData || [],
                recentActivity: recentActivityData || [],
                performance: performance || null
            };
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

        } catch (error: any) {
            console.error('Failed to fetch analytics data:', error);
            const message = error.response?.data?.message || 'Failed to load dashboard data. Please try again later.';
            if (error.response?.status === 403) {
                setAccessDeniedMessage(message);
                setCanViewWorkspaceAnalytics(false);
                setAvailableViews(['personal']);
            } else {
                import('sonner').then(({ toast }) => toast.error(message));
            }
        } finally {
            setLoading(false);
        }
    }, [workspaceId, CACHE_DURATION, CACHE_KEY, getPresetDates, selectedView]);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    useEffect(() => {
        const currentViewParam = searchParams.get('view');
        const shouldBePersonal = selectedView === 'personal';
        const isAlreadySynced = shouldBePersonal
            ? currentViewParam === 'personal'
            : !currentViewParam;

        if (isAlreadySynced) return;

        const params = new URLSearchParams(searchParams.toString());
        if (shouldBePersonal) {
            params.set('view', 'personal');
        } else {
            params.delete('view');
        }

        const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [selectedView, pathname, router, searchParams]);

    useEffect(() => {
        const explicitView = searchParams.get('view');
        if (!explicitView) return;
        const urlView: AnalyticsView = explicitView === 'personal' ? 'personal' : 'workspace';
        if (urlView !== selectedView) {
            setSelectedView(urlView);
        }
    }, [searchParams, selectedView]);

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
        const backendCompletionRate =
            typeof stats?.completionRate === 'number'
                ? Number(stats.completionRate).toFixed(1)
                : (totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0");

        return {
            totalTeam: members.length,
            clockedIn: clockedInMembers,
            totalTasks,
            completedTasks,
            completionRate: backendCompletionRate,
            delayedOpenTasks: Number(stats?.delayedOpenTasks || 0),
            delayedRate: Number(stats?.delayedRate || 0),
            deadlineCompletionRate: Number(stats?.deadlineCompletionRate ?? 100),
            activeProjects: spaces.filter(s => s.status === 'active').length,
        };
    }, [tasks, spaces, members, stats]);

    const statusStats = useMemo(() => {
        const now = new Date();
        return {
            todo: tasks.filter(t => t.status === 'todo').length,
            inprogress: tasks.filter(t => t.status === 'inprogress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
            delayed: tasks.filter((t: any) => {
                const s = String(t.status || '').toLowerCase();
                if (s === 'done' || s === 'cancelled') return false;
                if (!t.deadline) return false;
                return new Date(t.deadline) < now;
            }).length,
        };
    }, [tasks]);

    const priorityStats = useMemo(() => {
        const fallback = {
            high: { total: 0, done: 0, completionRate: 0, deadlineSuccess: 100, delayedOpen: 0 },
            medium: { total: 0, done: 0, completionRate: 0, deadlineSuccess: 100, delayedOpen: 0 },
            low: { total: 0, done: 0, completionRate: 0, deadlineSuccess: 100, delayedOpen: 0 },
        };

        if (stats?.priorityPerformance && typeof stats.priorityPerformance === 'object') {
            return {
                high: { ...fallback.high, ...stats.priorityPerformance.high },
                medium: { ...fallback.medium, ...stats.priorityPerformance.medium },
                low: { ...fallback.low, ...stats.priorityPerformance.low },
            };
        }

        // Backward-compat fallback for older analytics payloads
        const taskRows = tasks || [];
        const now = new Date();
        const summarize = (rows: any[]) => {
            const total = rows.length;
            const doneRows = rows.filter((t: any) => String(t.status || '').toLowerCase() === 'done');
            const done = doneRows.length;
            const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
            const doneWithDeadline = doneRows.filter((t: any) => !!t.deadline);
            const onTimeDone = doneWithDeadline.filter((t: any) => {
                if (!t.completedAt || !t.deadline) return false;
                return new Date(t.completedAt) <= new Date(t.deadline);
            }).length;
            const deadlineSuccess = doneWithDeadline.length > 0
                ? Math.round((onTimeDone / doneWithDeadline.length) * 100)
                : 100;
            const delayedOpen = rows.filter((t: any) => {
                const s = String(t.status || '').toLowerCase();
                if (s === 'done' || s === 'cancelled') return false;
                if (!t.deadline) return false;
                return new Date(t.deadline) < now;
            }).length;
            return { total, done, completionRate, deadlineSuccess, delayedOpen };
        };

        return {
            high: summarize(taskRows.filter((t: any) => t.priority === 'high' || t.priority === 'urgent')),
            medium: summarize(taskRows.filter((t: any) => t.priority === 'medium')),
            low: summarize(taskRows.filter((t: any) => t.priority === 'low')),
        };
    }, [tasks, stats]);

    const delayedOpenTasks = useMemo(() => {
        const now = new Date();
        return tasks.filter((t: any) => {
            const assigneeId = typeof t.assignee === 'string' ? t.assignee : t.assignee?._id;
            if (assigneeId !== userId) return false;
            const s = String(t.status || '').toLowerCase();
            if (s === 'done' || s === 'cancelled') return false;
            if (!t.deadline) return false;
            return new Date(t.deadline) < now;
        });
    }, [tasks, userId]);

    useEffect(() => {
        if (isDelayedFocus && yourTasksRef.current) {
            yourTasksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isDelayedFocus, delayedOpenTasks.length]);

    useEffect(() => {
        const handleFocusDelayed = () => {
            if (yourTasksRef.current) {
                yourTasksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
        window.addEventListener('focusDelayedOpenTasks', handleFocusDelayed);
        return () => window.removeEventListener('focusDelayedOpenTasks', handleFocusDelayed);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <BarChart3 className="w-12 h-12 animate-pulse text-primary mr-2" />
                <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
        );
    }

    if (accessDeniedMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h1 className="text-2xl font-bold text-foreground">Analytics unavailable</h1>
                    <p className="mt-3 text-sm text-muted-foreground">{accessDeniedMessage}</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Button variant="outline" onClick={() => router.back()}>
                            Go back
                        </Button>
                        <Button onClick={() => fetchAnalyticsData(true)}>
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-[1440px] mx-auto px-6 py-5">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
                    {announcementPermissions.canCreateAnnouncements && (
                        <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => window.location.href = `/workspace/${workspaceId}/time-tracking`}
                        >
                            <BarChart3 className="w-4 h-4" />
                            Time Tracking
                        </Button>
                    )}
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={range}
                        onChange={(e) => setRange(e.target.value as '7d' | '30d' | '90d' | 'all' | 'custom')}
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="all">All time</option>
                        <option value="custom">Custom range</option>
                    </select>
                    {range === 'custom' && (
                        <>
                            <input
                                type="date"
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                            />
                            <input
                                type="date"
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                            />
                        </>
                    )}
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard title="Total Team" value={metrics.totalTeam} icon={<Users className="w-5 h-5"/>} color="blue" badge={`+${metrics.clockedIn} Clocked in`} />
                    <MetricCard title="Total Tasks" value={metrics.totalTasks} icon={<CheckCircle2 className="w-5 h-5"/>} color="primary" subtext={`${metrics.completedTasks} done`} />
                    <MetricCard title="On-time Completion Rate" value={`${metrics.deadlineCompletionRate}%`} icon={<TrendingUp className="w-5 h-5"/>} color="emerald" subtext={`${metrics.completedTasks} done`} />
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
                    <div id="your-assigned-work" ref={yourTasksRef} className="lg:col-span-2">
                        <YourTasks
                            tasks={isDelayedFocus ? delayedOpenTasks : tasks}
                            userId={userId}
                            workspaceId={workspaceId}
                            mode={isDelayedFocus ? 'delayed-open' : 'all'}
                        />
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
                    <Announcements
                        workspaceId={workspaceId}
                        canCreateAnnouncement={announcementPermissions.canCreateAnnouncements}
                        canDeleteAnnouncement={announcementPermissions.canDeleteAnnouncements}
                        initialAnnouncements={announcements}
                    />
                    <StickyNotes 
                        workspaceId={workspaceId} 
                        userId={userId} 
                        initialContent={stickyNote?.content}
                    />
                </div>

                {/* Workspace Activity Timeline */}
                <div className="mb-8">
                    <WorkspaceActivity
                        workspaceId={workspaceId}
                        userId={userId}
                        initialActivities={recentActivity}
                    />
                </div>

                {/* Performance Metrics */}
                <div className="mb-8">
                    <PerformanceMetrics
                        workspaceId={workspaceId}
                        userId={userId}
                        canViewTeamPerformance={selectedView === 'workspace' && canViewWorkspaceAnalytics}
                        initialMyMetrics={performanceData?.user || null}
                        initialTeamMetrics={Array.isArray(performanceData?.team) ? performanceData?.team : []}
                    />
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
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{value}</h3>
                    {badge && (
                        <Badge
                            variant="outline"
                            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                            {badge}
                        </Badge>
                    )}
                    {subtext && <span className="text-xs font-semibold text-emerald-500">{subtext}</span>}
                </div>
            </CardContent>
        </Card>
    );
}
