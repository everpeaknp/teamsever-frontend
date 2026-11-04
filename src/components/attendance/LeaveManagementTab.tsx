'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Search, Loader2, RotateCcw, CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { normalizeLeaveResponse } from './leaveRequestResponse';

interface LeaveItem {
  _id: string;
  requester: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    profilePicture?: string;
    jobTitle?: string;
    department?: string;
  };
  assignedManager: {
    _id: string;
    name: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  deniedBy?: {
    _id: string;
    name: string;
  };
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  denialReason?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled';
  isExceedingMonthlyQuota?: boolean;
  leaveWarnings?: Array<{ period: 'monthly' | 'yearly'; key: string; limit: number; projected: number; overBy: number }>;
  requestType?: 'leave' | 'remote' | 'site_visit';
  siteVisitDetails?: {
    siteName?: string;
    clientName?: string;
    purpose?: string;
    address?: string;
  };
  createdAt: string;
}

export function LeaveManagementTab({ workspaceId }: { workspaceId: string }) {
  const PAGE_SIZE = 10;
  const [activeLeavesToday, setActiveLeavesToday] = useState<LeaveItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [members, setMembers] = useState<Array<{ _id: string; name: string; email?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<'my' | 'overall' | 'review'>('my');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => new Date());
  const [calendarLeaves, setCalendarLeaves] = useState<LeaveItem[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [canViewOverall, setCanViewOverall] = useState(false);
  const [canReviewRequests, setCanReviewRequests] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled'>('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'leave' | 'remote' | 'site_visit'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fetchSequence = useRef(0);

  const fetchSupportingData = async () => {
    try {
      const [todayRes, membersRes, reviewRes, overallRes] = await Promise.allSettled([
        api.get(`/workspaces/${workspaceId}/leaves/today`),
        api.get(`/workspaces/${workspaceId}/members`),
        api.get(`/workspaces/${workspaceId}/leaves/inbox`, { params: { page: 1, pageSize: 1 } }),
        api.get(`/workspaces/${workspaceId}/leaves`, { params: { page: 1, pageSize: 1 } }),
      ]);
      const todayLeaves: LeaveItem[] = todayRes.status === 'fulfilled' ? todayRes.value.data.data || [] : [];
      const uniqueTodayLeaves = new Map<string, LeaveItem>();
      for (const leave of todayLeaves) {
        const requesterId = leave.requester?._id || leave.requester?.email || leave._id;
        if (!uniqueTodayLeaves.has(requesterId)) uniqueTodayLeaves.set(requesterId, leave);
      }
      setActiveLeavesToday(Array.from(uniqueTodayLeaves.values()).sort((a, b) =>
        (a.requester?.name || '').localeCompare(b.requester?.name || '')
      ));
      setMembers(membersRes.status === 'fulfilled' ? membersRes.value.data.data || [] : []);
      setCanReviewRequests(reviewRes.status === 'fulfilled');
      setCanViewOverall(overallRes.status === 'fulfilled');
      if (todayRes.status === 'rejected' && membersRes.status === 'rejected' && reviewRes.status === 'rejected' && overallRes.status === 'rejected') toast.error('You do not have permission to view attendance and leave records');
    } catch (err: any) {
    }
  };

  const fetchLeaves = async (requestedPage = page) => {
    const sequence = ++fetchSequence.current;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: requestedPage, pageSize: PAGE_SIZE };
      if (activeScope !== 'review' && filterStatus !== 'all') params.status = filterStatus;
      if (activeScope !== 'my' && filterUser !== 'all') params.userId = filterUser;
      if (filterType !== 'all') params.requestType = filterType;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const endpoint = activeScope === 'my'
        ? `/workspaces/${workspaceId}/leaves/my-requests`
        : activeScope === 'review'
          ? `/workspaces/${workspaceId}/leaves/inbox`
          : `/workspaces/${workspaceId}/leaves`;
      const response = await api.get(endpoint, { params });
      if (sequence !== fetchSequence.current) return;
      const result = normalizeLeaveResponse(response.data);
      setLeaves(result.items as unknown as LeaveItem[]);
      const responseTotal = Number(result.pagination.total);
      const resolvedTotal = Number.isFinite(responseTotal) ? responseTotal : result.items.length;
      setTotal(resolvedTotal);
      setTotalPages(Number(result.pagination.totalPages) || Math.ceil(resolvedTotal / PAGE_SIZE));
      setPage(Number(result.pagination.page) || requestedPage);
    } catch (err: any) {
      if (sequence !== fetchSequence.current) return;
      toast.error(err.response?.data?.message || 'Failed to load leave records');
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceId || viewMode !== 'calendar') return;
    let cancelled = false;
    const loadCalendar = async () => {
      setCalendarLoading(true);
      try {
        const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
        const monthEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
        const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const from = dateFrom && dateFrom > localKey(monthStart) ? dateFrom : localKey(monthStart);
        const to = dateTo && dateTo < localKey(monthEnd) ? dateTo : localKey(monthEnd);
        if (from > to) { setCalendarLeaves([]); return; }
        const reviewInbox = activeScope === 'review';
        const personal = activeScope === 'my' || (!canViewOverall && !reviewInbox);
        const endpoint = reviewInbox
          ? `/workspaces/${workspaceId}/leaves/inbox`
          : personal
            ? `/workspaces/${workspaceId}/leaves/my-requests`
            : `/workspaces/${workspaceId}/leaves`;
        const params: Record<string, string | number> = { page: 1, pageSize: 50, from, to };
        if (filterStatus !== 'all' && !reviewInbox) params.status = filterStatus;
        if (filterType !== 'all') params.requestType = filterType;
        if (!personal && filterUser !== 'all') params.userId = filterUser;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        const first = await api.get(endpoint, { params });
        const all = [...(first.data.data || [])] as LeaveItem[];
        const totalPages = Math.min(20, Math.max(1, Number(first.data.pagination?.totalPages) || 1));
        if (totalPages > 1) {
          const otherPages = await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => api.get(endpoint, { params: { ...params, page: index + 2 } })));
          for (const response of otherPages) all.push(...(response.data.data || []));
        }
        if (!cancelled) setCalendarLeaves(all);
      } catch (error: any) {
        if (!cancelled) { setCalendarLeaves([]); toast.error(error?.response?.data?.message || 'Could not load the leave calendar'); }
      } finally { if (!cancelled) setCalendarLoading(false); }
    };
    void loadCalendar();
    return () => { cancelled = true; };
  }, [workspaceId, viewMode, calendarMonth, activeScope, canViewOverall, filterStatus, filterUser, filterType, dateFrom, dateTo, searchQuery]);

  const decideRequest = async (requestId: string, decision: 'approve' | 'deny') => {
    const denialInput = decision === 'deny' ? window.prompt('Optional reason for denying this request:') : undefined;
    if (denialInput === null) return;
    const denialReason = denialInput?.trim();
    try {
      await api.patch(`/workspaces/${workspaceId}/leaves/${requestId}/${decision}`, { denialReason });
      toast.success(`Request ${decision === 'approve' ? 'approved' : 'denied'}`);
      await Promise.all([fetchLeaves(page), fetchSupportingData()]);
    } catch (error: any) { toast.error(error.response?.data?.message || `Could not ${decision} remote request`); }
  };

  const cancelRequest = async (requestId: string) => {
    if (!window.confirm('Cancel this request? The requester and approver will be notified.')) return;
    try {
      await api.patch(`/workspaces/${workspaceId}/leaves/${requestId}/cancel`);
      setCalendarLeaves((current) => current.map((leave) => leave._id === requestId ? { ...leave, status: 'cancelled' } : leave));
      toast.success('Request cancelled');
      await Promise.all([fetchLeaves(page), fetchSupportingData()]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Could not cancel this request');
      await fetchLeaves(page);
    }
  };

  useEffect(() => {
    if (workspaceId) void fetchSupportingData();
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    const timeout = window.setTimeout(() => void fetchLeaves(page), searchQuery ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [workspaceId, page, activeScope, filterStatus, filterUser, filterType, dateFrom, dateTo, searchQuery]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calendarStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1 - new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index));
  const calendarDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const calendarLabel = calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const leaveForDay = (date: Date) => {
    const day = calendarDayKey(date);
    return calendarLeaves.filter((leave) => leave.startDate.slice(0, 10) <= day && leave.endDate.slice(0, 10) >= day);
  };
  const selectedDayLeaves = leaveForDay(selectedCalendarDay);

  const filteredLeaves = leaves;
  const canCancelInScope = activeScope === 'my' || activeScope === 'review' || (activeScope === 'overall' && canReviewRequests);

  const updateFilter = (update: () => void) => {
    update();
    setPage(1);
  };

  const clearFilters = () => {
    updateFilter(() => {
      setFilterStatus('all');
      setFilterUser('all');
      setFilterType('all');
      setDateFrom('');
      setDateTo('');
      setSearchQuery('');
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. "Who's on Leave Today" Banner */}
      <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🌴</span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">On leave today</h3>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[11px] font-medium">
            {activeLeavesToday.length} away today
          </Badge>
        </div>

        {activeLeavesToday.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">No approved leave today</p>
        ) : (
          <div aria-label="People on leave today" className="mt-2 flex gap-3 overflow-x-auto pb-0.5">
            {activeLeavesToday.map((item) => (
              <div
                key={item._id}
                className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg bg-muted/50 px-2 py-1.5"
              >
                <UserAvatar user={item.requester} className="h-7 w-7 shrink-0" />
                <span className="max-w-36 truncate text-xs font-medium text-foreground">{item.requester?.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Leave History & Directory Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex justify-end gap-2 border-b border-border/60 px-4 pt-3">
          <Button type="button" variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><List className="mr-1.5 h-4 w-4" />List</Button>
          <Button type="button" variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" aria-pressed={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}><CalendarDays className="mr-1.5 h-4 w-4" />Calendar</Button>
        </div>
        <div role="tablist" aria-label="Leave request scope" className="flex items-center gap-1 border-b border-border/60 px-4 pt-3">
          {([
            ['my', 'My requests'],
            ...(canViewOverall ? [['overall', 'Overall'] as const] : []),
            ...(canReviewRequests ? [['review', 'Review inbox'] as const] : []),
          ] as const).map(([scope, title]) => (
            <button
              key={scope}
              type="button"
              role="tab"
              aria-selected={activeScope === scope}
              onClick={() => updateFilter(() => setActiveScope(scope))}
              className={cn('rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors', activeScope === scope ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {title}
            </button>
          ))}
        </div>
        {/* Filter bar */}
        <div className="space-y-4 border-b border-border/60 bg-muted/10 p-4 sm:p-5">
          <div className={cn('grid grid-cols-1 items-end gap-3 sm:grid-cols-2', activeScope === 'my' ? 'xl:grid-cols-4' : 'xl:grid-cols-5')}>
            <div className="relative min-w-0 sm:col-span-2 xl:col-span-1">
              <label htmlFor="leave-request-search" className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Search</label>
              <Search className="absolute left-3 top-[37px] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="leave-request-search"
                placeholder="Search by member or reason..."
                value={searchQuery}
                onChange={(e) => updateFilter(() => setSearchQuery(e.target.value))}
                className="h-9 rounded-lg bg-background pl-9 text-sm"
              />
            </div>
            {activeScope !== 'my' && <label className="min-w-0 text-[11px] font-medium text-muted-foreground">
              Member
              <select
                aria-label="Filter by member"
                value={filterUser}
                onChange={(e) => updateFilter(() => setFilterUser(e.target.value))}
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="all">All members</option>
                {members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
              </select>
            </label>}
            <label className="min-w-0 text-[11px] font-medium text-muted-foreground">
              Request type
              <select
                aria-label="Filter by request type"
                value={filterType}
                onChange={(e) => updateFilter(() => setFilterType(e.target.value as typeof filterType))}
                className="mt-1.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Leave & remote</option>
                <option value="leave">Leave</option>
                <option value="remote">Remote</option>
                <option value="site_visit">Site visit</option>
              </select>
            </label>
            <label className="min-w-0 text-[11px] font-medium text-muted-foreground">
              From
              <Input aria-label="From date" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => updateFilter(() => setDateFrom(e.target.value))} className="mt-1.5 h-9 w-full text-sm" />
            </label>
            <label className="min-w-0 text-[11px] font-medium text-muted-foreground">
              To
              <Input aria-label="To date" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => updateFilter(() => setDateTo(e.target.value))} className="mt-1.5 h-9 w-full text-sm" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
            {activeScope !== 'review' && (['all', 'pending', 'approved', 'denied', 'expired', 'cancelled'] as const).map((st) => (
              <Button
                key={st}
                type="button"
                variant={filterStatus === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter(() => setFilterStatus(st))}
                className="h-8 min-w-[76px] rounded-lg px-3 text-xs font-medium"
              >
                {({ all: 'All', pending: 'Pending', approved: 'Approved', denied: 'Denied', expired: 'Expired', cancelled: 'Cancelled' } as const)[st]}
              </Button>
            ))}
            <div className="ml-auto flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <span className="whitespace-nowrap text-xs text-muted-foreground">{activeScope === 'review' ? `${total} awaiting your review` : `${total} requests`}</span>
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 px-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Clear filters
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'calendar' ? <section aria-label="Leave calendar" className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">{calendarLabel}</h2><p className="text-xs text-muted-foreground">{activeScope === 'my' || (!canViewOverall && activeScope === 'review') ? 'Your requests' : 'Workspace requests'} · {calendarLeaves.length} matching request{calendarLeaves.length === 1 ? '' : 's'}</p></div>
            <div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" aria-label="Previous month" onClick={() => { const month = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); setCalendarMonth(month); setSelectedCalendarDay(month); }}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" onClick={() => { const now = new Date(); setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedCalendarDay(now); }}>Today</Button><Button type="button" size="icon" variant="outline" aria-label="Next month" onClick={() => { const month = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); setCalendarMonth(month); setSelectedCalendarDay(month); }}><ChevronRight className="h-4 w-4" /></Button></div>
          </div>
          <div className="grid grid-cols-7 border-l border-t text-center text-[11px] font-semibold text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="border-b border-r bg-muted/30 py-2">{day}</div>)}</div>
          {calendarLoading ? <div className="flex justify-center py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading calendar</div> : <div className="grid grid-cols-7 border-l border-t">{calendarDays.map((date) => {
            const dayLeaves = leaveForDay(date);
            const inMonth = date.getMonth() === calendarMonth.getMonth();
            return <button type="button" key={calendarDayKey(date)} aria-label={`Select ${calendarDayKey(date)}, ${dayLeaves.length} requests`} aria-pressed={calendarDayKey(date) === calendarDayKey(selectedCalendarDay)} onClick={() => { setSelectedCalendarDay(date); if (!inMonth) setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} className={cn('min-h-24 w-full border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 sm:min-h-32 sm:p-2', calendarDayKey(date) === calendarDayKey(selectedCalendarDay) && 'bg-primary/5 ring-1 ring-inset ring-primary/50', !inMonth && 'bg-muted/20 text-muted-foreground')}>
              <div className={cn('mb-1 grid h-6 w-6 place-items-center rounded-full text-xs', calendarDayKey(date) === calendarDayKey(new Date()) && 'bg-primary text-primary-foreground')}>{date.getDate()}</div>
              <div className="space-y-1">{dayLeaves.slice(0, 3).map((leave) => <div key={leave._id} title={`${leave.requester?.name || 'Member'} · ${leave.status} · ${leave.requestType === 'site_visit' ? 'Site Visit' : leave.requestType === 'remote' ? 'Remote' : 'Leave'}`} className={cn('truncate rounded px-1 py-0.5 text-left text-[10px] sm:text-xs', leave.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : leave.status === 'pending' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-muted text-muted-foreground')}>
                <span className="font-medium">{leave.requester?.name || 'Member'}</span><span className="hidden sm:inline"> · {leave.requestType === 'site_visit' ? 'Site Visit' : leave.requestType === 'remote' ? 'Remote' : 'Leave'}</span>
              </div>)}{dayLeaves.length > 3 && <p className="px-1 text-[10px] text-muted-foreground">+{dayLeaves.length - 3} more</p>}</div>
            </button>;
          })}</div>}
          <section aria-label={`Requests for ${calendarDayKey(selectedCalendarDay)}`} className="space-y-2 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">{selectedCalendarDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              <span className="text-xs text-muted-foreground">{selectedDayLeaves.length} request{selectedDayLeaves.length === 1 ? '' : 's'}</span>
            </div>
            {selectedDayLeaves.length === 0 ? <p className="rounded-lg bg-muted/30 px-3 py-4 text-sm text-muted-foreground">No requests for this day.</p> : selectedDayLeaves.map((leave) => (
              <article key={leave._id} className="rounded-xl border border-border/70 bg-background p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">{leave.requester?.name || 'Workspace member'} · {leave.requestType === 'site_visit' ? 'Site visit' : leave.requestType === 'remote' ? 'Remote work' : 'Leave'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(leave.startDate)} – {formatDate(leave.endDate)} · {leave.daysCount} day{leave.daysCount === 1 ? '' : 's'}</p>
                  </div>
                  <Badge variant="outline" className={cn('capitalize', leave.status === 'pending' && 'border-amber-500/30 bg-amber-500/10 text-amber-700', leave.status === 'approved' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700')}>{leave.status}</Badge>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">{leave.reason || 'No reason provided'}</p>
                {(leave.leaveWarnings?.length || leave.isExceedingMonthlyQuota) ? <div className="mt-2 space-y-0.5 text-xs font-medium text-amber-700"><p className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Leave warning limit exceeded</p>{leave.leaveWarnings?.map((warning) => <p key={`${warning.period}:${warning.key}`}>{warning.period} limit: {warning.projected} of {warning.limit} days</p>)}</div> : null}
                {canCancelInScope && ['pending', 'approved'].includes(leave.status) && <Button className="mt-3 w-full sm:w-auto" size="sm" variant="outline" onClick={() => void cancelRequest(leave._id)}>Cancel request</Button>}
              </article>
            ))}
          </section>
        </section> : <>
        {/* Content Table */}
        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-xs">Loading leave records...</span>
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="text-center py-12 px-4 text-muted-foreground text-xs">
            No leave requests found matching your filter.
          </div>
        ) : (
          <>
          <div className="space-y-3 p-3 md:hidden">
            {filteredLeaves.map((leave) => (
              <article key={leave._id} className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <UserAvatar user={leave.requester} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{leave.requester?.name || 'Workspace member'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{leave.requester?.department || leave.requester?.email}</p>
                  </div>
                  <Badge variant="outline" className={cn('shrink-0 capitalize', leave.status === 'pending' && 'border-amber-500/30 bg-amber-500/10 text-amber-600', leave.status === 'approved' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600', leave.status === 'denied' && 'border-rose-500/30 bg-rose-500/10 text-rose-600')}>{leave.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <Badge variant="outline">{leave.requestType === 'site_visit' ? 'Site Visit' : leave.requestType === 'remote' ? 'Remote' : 'Leave'}</Badge>
                  <span className="font-medium text-foreground">{leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</span>
                </div>
                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
                  <p className="mt-1 break-words text-xs text-foreground">{leave.reason || 'No reason provided'}</p>
                  {(leave.leaveWarnings?.length || leave.isExceedingMonthlyQuota) ? <div className="mt-1 space-y-0.5 text-[10px] font-medium text-amber-600"><p className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Leave warning limit exceeded</p>{leave.leaveWarnings?.map((warning) => <p key={`${warning.period}:${warning.key}`}>{warning.period} limit: {warning.projected} of {warning.limit} days</p>)}</div> : null}
                </div>
                {activeScope === 'review' && leave.status === 'pending' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                    <Button size="sm" variant="outline" onClick={() => void decideRequest(leave._id, 'deny')}>Deny</Button>
                    <Button size="sm" onClick={() => void decideRequest(leave._id, 'approve')}>Approve</Button>
                  </div>
                ) : leave.status === 'approved' ? <p className="mt-3 text-[11px] text-muted-foreground">Approved by {leave.approvedBy?.name || 'Manager'}</p> : leave.status === 'denied' ? <p className="mt-3 text-[11px] text-muted-foreground">Denied by {leave.deniedBy?.name || 'Manager'}{leave.denialReason ? ` · ${leave.denialReason}` : ''}</p> : leave.status === 'cancelled' ? <p className="mt-3 text-[11px] text-muted-foreground">Cancelled</p> : null}
                {canCancelInScope && ['pending', 'approved'].includes(leave.status) && <Button className="mt-3 w-full" size="sm" variant="outline" onClick={() => void cancelRequest(leave._id)}>Cancel request</Button>}
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Duration & Dates</th>
                  <th className="px-4 py-3">Explicit Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">{activeScope === 'review' ? 'Review' : 'Approver / Decision'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredLeaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={leave.requester} className="h-7 w-7" />
                        <div>
                          <p className="font-semibold text-foreground">{leave.requester?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{leave.requester?.department || leave.requester?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        <Badge variant="outline" className="mr-2">{leave.requestType === 'site_visit' ? 'Site Visit' : leave.requestType === 'remote' ? 'Remote' : 'Leave'}</Badge>
                        {leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-foreground/90 font-medium" title={leave.reason}>
                        {leave.reason}
                      </p>
                      {(leave.leaveWarnings?.length || leave.isExceedingMonthlyQuota) && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> {leave.leaveWarnings?.map((warning) => `${warning.period} ${warning.projected}/${warning.limit}`).join(' · ') || 'Leave warning limit exceeded'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {leave.status === 'pending' && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-[11px]">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                      {leave.status === 'approved' && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Approved
                        </Badge>
                      )}
                      {leave.status === 'denied' && (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 gap-1 text-[11px]">
                          <XCircle className="h-3 w-3" /> Denied
                        </Badge>
                      )}
                      {leave.status === 'expired' && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-[11px]">
                          <Clock className="h-3 w-3" /> Expired
                        </Badge>
                      )}
                      {leave.status === 'cancelled' && <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-[11px]">Cancelled</Badge>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {activeScope === 'review' && leave.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => void decideRequest(leave._id, 'approve')}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => void decideRequest(leave._id, 'deny')}>Deny</Button>
                        </div>
                      ) : leave.status === 'approved' ? (
                        <span>By {leave.approvedBy?.name || 'Manager'}</span>
                      ) : leave.status === 'denied' ? (
                        <div>
                          <span>By {leave.deniedBy?.name || 'Manager'}</span>
                          {leave.denialReason && (
                            <p className="text-[10px] text-rose-400 italic mt-0.5 truncate max-w-xs" title={leave.denialReason}>
                              &quot;{leave.denialReason}&quot;
                            </p>
                          )}
                        </div>
                      ) : leave.status === 'pending' ? (
                        <span>Assigned: {leave.assignedManager?.name}</span>
                      ) : leave.status === 'cancelled' ? (
                        <span>Cancelled</span>
                      ) : null}
                      {canCancelInScope && ['pending', 'approved'].includes(leave.status) && <Button size="sm" variant="outline" className="ml-2" onClick={() => void cancelRequest(leave._id)}>Cancel</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        {!loading && totalPages > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/10 px-4 py-3 text-xs">
            <span className="text-muted-foreground">Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button type="button" size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</Button>
            </div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
export default LeaveManagementTab;
