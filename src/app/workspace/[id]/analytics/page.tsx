'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/axios';
import {
    TrendingUp, Users, CheckCircle2, Rocket, Loader2,
    BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Task } from '@/types';
import { useRef } from 'react';
import { TaskStatusChart } from '@/components/analytics/TaskStatusChart';

type AnalyticsView = 'workspace' | 'personal';
type RangeKey = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

// Dynamic imports for heavy chart components - reduces initial bundle size
const CompletionTrendChart = dynamic(
    () => import('@/components/analytics/CompletionTrendChart').then(mod => ({ default: mod.CompletionTrendChart })),
    { 
        ssr: false,
        loading: () => <Card><CardContent className="pt-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
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
    const [trendData, setTrendData] = useState<Array<{ name: string; created: number; completed: number }>>([]);
    const [trendLoading, setTrendLoading] = useState(false);
    const [taskStatusSummary, setTaskStatusSummary] = useState<{
        totalTasks: number;
        completed: number;
        delayed: number;
        distribution: Array<{ label?: string; value?: number }>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [userId, setUserId] = useState<string>('');
    const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('inactive');
    const [runningTimer, setRunningTimer] = useState<any>(null);
    const [timeTrackingSummary, setTimeTrackingSummary] = useState<any>(null);
    const [canViewWorkspaceAnalytics, setCanViewWorkspaceAnalytics] = useState(false);
    const [announcementPermissions, setAnnouncementPermissions] = useState({
        canViewAnnouncements: true,
        canCreateAnnouncements: false,
        canDeleteAnnouncements: false,
    });
    const [availableViews, setAvailableViews] = useState<AnalyticsView[]>(['personal']);
    const initialRangeParam = searchParams.get('range');
    const initialRange: RangeKey =
        initialRangeParam === '7d' || initialRangeParam === '30d' || initialRangeParam === '90d' || initialRangeParam === 'all' || initialRangeParam === 'custom'
            ? initialRangeParam
            : 'today';
    const [selectedView, setSelectedView] = useState<AnalyticsView>(initialView);
    const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const [range, setRange] = useState<RangeKey>(initialRange);
    const [customFrom, setCustomFrom] = useState(todayStr);
    const [customTo, setCustomTo] = useState(todayStr);
    const backgroundRefreshDoneRef = useRef<Set<string>>(new Set());
    const viewChangeFromUIRef = useRef(false);
    const requestSeqRef = useRef(0);
    const lastFetchedKeyRef = useRef<string>('');
    
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
    const CACHE_KEY = `analytics_cache_${workspaceId}_${selectedView}_${range}_${customFrom}_${customTo}`;

    const getPresetDates = useCallback(() => {
        if (range === 'all') return { from: '', to: '' };
        if (range === 'custom') return { from: customFrom, to: customTo };
        if (range === 'today') {
            return { from: todayStr, to: todayStr };
        }
        const now = new Date();
        const from = new Date(now);
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        from.setDate(now.getDate() - days);
        return {
            from: from.toISOString().slice(0, 10),
            to: now.toISOString().slice(0, 10),
        };
    }, [range, customFrom, customTo, todayStr]);

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
                            setTimeTrackingSummary(parsed.timeTrackingSummary || null);
                            setTaskStatusSummary(parsed.taskStatusSummary || null);
                            setTrendData(parsed.trendData || []);
                            setCanViewWorkspaceAnalytics(parsed.canViewWorkspaceAnalytics || false);
                            setAnnouncementPermissions(parsed.announcementPermissions || {
                                canViewAnnouncements: true,
                                canCreateAnnouncements: false,
                                canDeleteAnnouncements: false,
                            });
                            setAvailableViews(parsed.availableViews || ['personal']);
                            const cachedView: AnalyticsView = parsed.selectedView === 'personal' ? 'personal' : 'workspace';
                            const resolvedCachedView: AnalyticsView = cachedView;
                            if (resolvedCachedView !== selectedView) {
                                setSelectedView(resolvedCachedView);
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
                
                setSummaryLoading(true);
            }
            
            const localUserId = localStorage.getItem('userId') || '';
            if (localUserId) setUserId(localUserId);

            // Fast first paint: summary first, heavy blocks second
            console.log('[Analytics] Fetching analytics v2 summary');
            const { from, to } = getPresetDates();
            const query = new URLSearchParams();
            query.set('view', selectedView);
            if (from) query.set('from', from);
            if (to) query.set('to', to);
            const currentRequestSeq = ++requestSeqRef.current;
            const response = await api.get(`/v2/workspaces/${workspaceId}/analytics?${query.toString()}`);
            if (currentRequestSeq !== requestSeqRef.current) return;
            const summary = response.data?.data || {};
            const summaryMembers = [
                ...(summary?.teamAvailability?.liveNow || []),
                ...(summary?.teamAvailability?.clockedOut || [])
            ];

            setMembers(summaryMembers);
            setRunningTimer(summary?.timeTracking?.currentRunningTimer || null);
            setTimeTrackingSummary(summary?.timeTracking?.summary || null);
            setTrendLoading(true);
            setSpaces(
                (summary?.projectHealth?.spaces || []).map((space: any) => ({
                    _id: space.spaceId,
                    name: space.name,
                    totalTasks: space.total,
                    completedTasks: space.done
                }))
            );
            setWorkspace({ id: summary?.scope?.workspaceId || workspaceId });
            setStats({
                totalTasks: summary?.taskStatus?.totalTasks || 0,
                completedTasks: summary?.taskStatus?.completed || 0,
                delayedOpenTasks: summary?.taskStatus?.delayed || 0,
                deadlineCompletionRate: summary?.summary?.onTimeCompletionRate || 0,
                priorityPerformance: summary?.priorityDistribution || {},
                statusDistribution: summary?.taskStatus?.distribution || []
            });
            setTaskStatusSummary({
                totalTasks: summary?.taskStatus?.totalTasks || 0,
                completed: summary?.taskStatus?.completed || 0,
                delayed: summary?.taskStatus?.delayed || 0,
                distribution: summary?.taskStatus?.distribution || [],
            });
            setPerformanceData({
                user: performanceData?.user || null,
                team: summary?.teamPerformancePreview || []
            });
            setAccessDeniedMessage(null);

            // Determine current user's status
            let currentUserStatus: 'active' | 'inactive' = 'inactive';
            let currentCanViewWorkspaceAnalytics = false;
            
            if (localUserId) {
                // Determine Status from members array
                const currentMember = summaryMembers?.find((m: any) => {
                    const mId = typeof m.user === 'string' ? m.user : m.user?._id;
                    return mId === localUserId || m._id === localUserId;
                });
                currentUserStatus = currentMember?.status || 'inactive';
                setUserStatus(currentUserStatus);

            }
            currentCanViewWorkspaceAnalytics = !!summary?.scope?.view?.canViewWorkspaceAnalytics;
            setCanViewWorkspaceAnalytics(currentCanViewWorkspaceAnalytics);
            setAnnouncementPermissions({
                canViewAnnouncements: summary?.permissions?.canViewAnnouncements !== false,
                canCreateAnnouncements: !!summary?.permissions?.canCreateAnnouncements,
                canDeleteAnnouncements: !!summary?.permissions?.canDeleteAnnouncements,
            });
            const responseAvailableViews: AnalyticsView[] = Array.isArray(summary?.scope?.view?.available)
                ? summary.scope.view.available.filter((item: string) => item === 'workspace' || item === 'personal')
                : ['personal'];
            setAvailableViews(responseAvailableViews.length ? responseAvailableViews : ['personal']);

            const effectiveView: AnalyticsView = summary?.scope?.view?.effective === 'workspace' ? 'workspace' : 'personal';
            const resolvedView: AnalyticsView = effectiveView;
            if (resolvedView !== selectedView) {
                setSelectedView(resolvedView);
            }

            setSummaryLoading(false);

            // Heavy details load after first paint
            const scheduleDetailsLoad = () => {
                api.get(`/v2/workspaces/${workspaceId}/analytics/completion-trend?${query.toString()}`)
                    .then((trendRes) => {
                        if (currentRequestSeq !== requestSeqRef.current) return;
                        const trend = trendRes.data?.data || {};
                        setTrendData(Array.isArray(trend?.chartData) ? trend.chartData : []);
                    })
                    .catch((trendError) => {
                        console.error('[Analytics] Failed to load completion trend:', trendError);
                    })
                    .finally(() => {
                        if (currentRequestSeq === requestSeqRef.current) setTrendLoading(false);
                    });

                api.get(`/v2/workspaces/${workspaceId}/analytics/details?${query.toString()}`)
                    .then((detailsRes) => {
                        if (currentRequestSeq !== requestSeqRef.current) return;
                        const details = detailsRes.data?.data || {};
                        setMembers(details?.members || summaryMembers);
                        setRunningTimer(details?.currentRunningTimer || summary?.timeTracking?.currentRunningTimer || null);
                        setTimeTrackingSummary(details?.timeTrackingSummary || summary?.timeTracking?.summary || null);
                        setSpaces(details?.hierarchy || []);
                        setWorkspace(details?.workspace || { id: summary?.scope?.workspaceId || workspaceId });
                        setStats(details?.stats || {
                            totalTasks: summary?.taskStatus?.totalTasks || 0,
                            completedTasks: summary?.taskStatus?.completed || 0,
                            delayedOpenTasks: summary?.taskStatus?.delayed || 0,
                            deadlineCompletionRate: summary?.summary?.onTimeCompletionRate || 0,
                            priorityPerformance: summary?.priorityDistribution || {}
                        });
                        setTaskStatusSummary({
                            totalTasks: details?.stats?.totalTasks ?? (summary?.taskStatus?.totalTasks || 0),
                            completed: details?.stats?.completedTasks ?? (summary?.taskStatus?.completed || 0),
                            delayed: details?.stats?.delayedOpenTasks ?? (summary?.taskStatus?.delayed || 0),
                            distribution: Array.isArray(details?.stats?.statusDistribution)
                                ? details.stats.statusDistribution
                                : (summary?.taskStatus?.distribution || []),
                        });
                        setTasks(details?.tasks || []);
                        setStickyNote(details?.stickyNote || null);
                        setAnnouncements(details?.announcements || []);
                        setRecentActivity(details?.recentActivity || []);
                        setPerformanceData({
                            user: details?.performance?.user || performanceData?.user || null,
                            team: Array.isArray(details?.performance?.team) && details.performance.team.length > 0
                                ? details.performance.team
                                : (summary?.teamPerformancePreview || [])
                        });

                        const cacheData = {
                            timestamp: Date.now(),
                            tasks: details?.tasks || [],
                            spaces: details?.hierarchy || [],
                            members: details?.members || summaryMembers,
                            workspace: details?.workspace || { id: summary?.scope?.workspaceId || workspaceId },
                            stats: details?.stats || null,
                            taskStatusSummary: {
                                totalTasks: details?.stats?.totalTasks ?? (summary?.taskStatus?.totalTasks || 0),
                                completed: details?.stats?.completedTasks ?? (summary?.taskStatus?.completed || 0),
                                delayed: details?.stats?.delayedOpenTasks ?? (summary?.taskStatus?.delayed || 0),
                                distribution: Array.isArray(details?.stats?.statusDistribution)
                                    ? details.stats.statusDistribution
                                    : (summary?.taskStatus?.distribution || []),
                            },
                            trendData,
                            userId: localUserId,
                            userStatus: currentUserStatus,
                            runningTimer: details?.currentRunningTimer || summary?.timeTracking?.currentRunningTimer || null,
                            timeTrackingSummary: details?.timeTrackingSummary || summary?.timeTracking?.summary || null,
                            canViewWorkspaceAnalytics: currentCanViewWorkspaceAnalytics,
                            announcementPermissions: {
                                canViewAnnouncements: summary?.permissions?.canViewAnnouncements !== false,
                                canCreateAnnouncements: !!summary?.permissions?.canCreateAnnouncements,
                                canDeleteAnnouncements: !!summary?.permissions?.canDeleteAnnouncements,
                            },
                            availableViews: responseAvailableViews,
                            selectedView: resolvedView,
                            stickyNote: details?.stickyNote || null,
                            announcements: details?.announcements || [],
                            recentActivity: details?.recentActivity || [],
                            performance: {
                                user: details?.performance?.user || null,
                                team: Array.isArray(details?.performance?.team) && details.performance.team.length > 0
                                    ? details.performance.team
                                    : (summary?.teamPerformancePreview || [])
                            }
                        };
                        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    })
                    .catch((detailError) => {
                        console.error('[Analytics] Failed to load v2 details block:', detailError);
                    });
            };

            const loadDelay = force ? 250 : 600;
            if ('requestIdleCallback' in window) {
                (window as any).requestIdleCallback(() => {
                    setTimeout(scheduleDetailsLoad, loadDelay);
                }, { timeout: 1200 });
            } else {
                setTimeout(scheduleDetailsLoad, loadDelay);
            }

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
            setSummaryLoading(false);
        }
    }, [workspaceId, CACHE_DURATION, CACHE_KEY, getPresetDates, selectedView, performanceData]);

    useEffect(() => {
        const key = `${workspaceId}:${selectedView}:${range}:${range === 'custom' ? customFrom : ''}:${range === 'custom' ? customTo : ''}`;
        if (key === lastFetchedKeyRef.current) return;
        lastFetchedKeyRef.current = key;

        fetchAnalyticsData();
    }, [workspaceId, selectedView, range, customFrom, customTo, fetchAnalyticsData]);

    useEffect(() => {
        const shouldBePersonal = selectedView === 'personal';
        const params = new URLSearchParams();
        if (shouldBePersonal) {
            params.set('view', 'personal');
        }
        params.set('range', range);
        if (range === 'custom') {
            params.set('from', customFrom);
            params.set('to', customTo);
        }

        const nextUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
        window.history.replaceState(null, '', nextUrl);
    }, [selectedView, range, customFrom, customTo]);

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
        const distribution = Array.isArray(taskStatusSummary?.distribution) ? taskStatusSummary.distribution : Array.isArray(stats?.statusDistribution) ? stats.statusDistribution : [];
        if (distribution.length > 0) {
            const get = (label: string) => {
                const row = distribution.find((item: any) => String(item?.label || '').toLowerCase() === label.toLowerCase());
                return Number(row?.value || 0);
            };
            return {
                todo: get('To Do'),
                inprogress: get('In Progress'),
                review: get('Review'),
                done: get('Done'),
                delayed: Number(taskStatusSummary?.delayed ?? stats?.delayedOpenTasks ?? 0),
            };
        }
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
    }, [tasks, stats, taskStatusSummary]);

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

    if (accessDeniedMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h1 className="text-2xl font-bold text-foreground">Analytics unavailable</h1>
                    <p className="mt-3 text-sm text-muted-foreground">{accessDeniedMessage}</p>
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <Button variant="outline" onClick={() => window.history.back()}>
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
                    {(loading || summaryLoading) && (
                        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Updating
                        </div>
                    )}
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
                    {availableViews.length > 1 && (
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={selectedView}
                            onChange={(e) => {
                                setSelectedView(e.target.value as AnalyticsView);
                            }}
                        >
                            {availableViews.includes('workspace') && <option value="workspace">Workspace View</option>}
                            {availableViews.includes('personal') && <option value="personal">Personal View</option>}
                        </select>
                    )}
                    <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={range}
                        onChange={(e) => {
                            setRange(e.target.value as RangeKey);
                        }}
                    >
                        <option value="today">Today</option>
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
                    {loading && !stats ? (
                        <>
                            <Skeleton className="h-[128px] w-full rounded-2xl" />
                            <Skeleton className="h-[128px] w-full rounded-2xl" />
                            <Skeleton className="h-[128px] w-full rounded-2xl" />
                            <Skeleton className="h-[128px] w-full rounded-2xl" />
                        </>
                    ) : (
                        <>
                            <MetricCard title="Total Team" value={metrics.totalTeam} icon={<Users className="w-5 h-5"/>} color="blue" badge={`+${metrics.clockedIn} Clocked in`} />
                            <MetricCard title="Total Tasks" value={metrics.totalTasks} icon={<CheckCircle2 className="w-5 h-5"/>} color="primary" subtext={`${metrics.completedTasks} done`} />
                            <MetricCard title="On-time Completion Rate" value={`${metrics.deadlineCompletionRate}%`} icon={<TrendingUp className="w-5 h-5"/>} color="emerald" subtext={`${metrics.completedTasks} done`} />
                            <MetricCard title="Active Projects" value={metrics.activeProjects} icon={<Rocket className="w-5 h-5"/>} color="amber" />
                        </>
                    )}
                </div>

                {/* Clock In & Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {loading && !stats ? (
                        <>
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                        </>
                    ) : (
                        <>
                            <ClockInOut
                                workspaceId={workspaceId}
                                currentStatus={userStatus}
                                runningTimer={runningTimer}
                                timeTrackingSummary={timeTrackingSummary}
                                onStatusChange={fetchAnalyticsData}
                            />
                            <TaskStatusChart stats={statusStats} totalTasks={metrics.totalTasks} />
                            <PriorityDistribution stats={priorityStats} />
                        </>
                    )}
                </div>

                {/* Team & Tasks */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {loading && !stats ? (
                        <>
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                            <Skeleton className="h-[400px] w-full rounded-2xl lg:col-span-2" />
                        </>
                    ) : (
                        <>
                            <TeamAvailability members={members} />
                            <div id="your-assigned-work" ref={yourTasksRef} className="lg:col-span-2">
                                <YourTasks
                                    tasks={isDelayedFocus ? delayedOpenTasks : tasks}
                                    userId={userId}
                                    workspaceId={workspaceId}
                                    mode={isDelayedFocus ? 'delayed-open' : 'all'}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Health & Trends */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {loading && !stats ? (
                        <>
                            <Skeleton className="h-[400px] w-full rounded-2xl" />
                            <Skeleton className="h-[400px] w-full rounded-2xl lg:col-span-2" />
                        </>
                    ) : (
                        <>
                            <ProjectHealth spaces={spaces} tasks={tasks} />
                            <div className="lg:col-span-2">
                                <CompletionTrendChart tasks={tasks} trendData={trendData} loading={trendLoading} />
                            </div>
                        </>
                    )}
                </div>

                {/* Utilities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <Announcements
                        workspaceId={workspaceId}
                        canCreateAnnouncement={announcementPermissions.canCreateAnnouncements}
                        canDeleteAnnouncement={announcementPermissions.canDeleteAnnouncements}
                        initialAnnouncements={announcements}
                        managedByParent={true}
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
                        managedByParent={true}
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
                        managedByParent={true}
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
