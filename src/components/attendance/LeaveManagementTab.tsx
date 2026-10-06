'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Search, Loader2, RotateCcw } from 'lucide-react';
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
  status: 'pending' | 'approved' | 'denied' | 'expired';
  isExceedingMonthlyQuota?: boolean;
  requestType?: 'leave' | 'remote';
  createdAt: string;
}

export function LeaveManagementTab({ workspaceId }: { workspaceId: string }) {
  const PAGE_SIZE = 10;
  const [activeLeavesToday, setActiveLeavesToday] = useState<LeaveItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [members, setMembers] = useState<Array<{ _id: string; name: string; email?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<'my' | 'overall' | 'review'>('my');
  const [canViewOverall, setCanViewOverall] = useState(false);
  const [canReviewRequests, setCanReviewRequests] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied' | 'expired'>('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'leave' | 'remote'>('all');
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
      setActiveLeavesToday(todayRes.status === 'fulfilled' ? todayRes.value.data.data || [] : []);
      setMembers(membersRes.status === 'fulfilled' ? membersRes.value.data.data || [] : []);
      setCanReviewRequests(reviewRes.status === 'fulfilled');
      setCanViewOverall(overallRes.status === 'fulfilled');
      if (todayRes.status === 'rejected' && membersRes.status === 'rejected' && reviewRes.status === 'rejected' && overallRes.status === 'rejected') toast.error('You do not have permission to view attendance and leave records');
    } catch (err: any) {
      console.error('[LeaveManagementTab] Failed to fetch supporting attendance data:', err);
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
      console.error('[LeaveManagementTab] Failed to fetch leave history:', err);
      toast.error(err.response?.data?.message || 'Failed to load leave records');
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  };

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

  const filteredLeaves = leaves;

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
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/20 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌴</span>
            <div>
              <h3 className="text-sm font-bold text-foreground">Who&apos;s on Leave Today</h3>
              <p className="text-xs text-muted-foreground">
                Approved leaves active for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold text-xs">
            {activeLeavesToday.length} Away Today
          </Badge>
        </div>

        {activeLeavesToday.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            Everyone is in office today! No approved leaves recorded for today.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {activeLeavesToday.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-background/80 border border-border/60 shadow-xs"
              >
                <UserAvatar user={item.requester} className="h-9 w-9 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{item.requester?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.reason}</p>
                  <p className="text-[10px] text-emerald-500 font-medium">
                    Until {formatDate(item.endDate)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Leave History & Directory Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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
            {activeScope !== 'review' && (['all', 'pending', 'approved', 'denied', 'expired'] as const).map((st) => (
              <Button
                key={st}
                type="button"
                variant={filterStatus === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter(() => setFilterStatus(st))}
                className="h-8 min-w-[76px] rounded-lg px-3 text-xs font-medium"
              >
                {({ all: 'All', pending: 'Pending', approved: 'Approved', denied: 'Denied', expired: 'Expired' } as const)[st]}
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
                  <Badge variant="outline">{leave.requestType === 'remote' ? 'Remote' : 'Leave'}</Badge>
                  <span className="font-medium text-foreground">{leave.daysCount} day{leave.daysCount > 1 ? 's' : ''}</span>
                  <span className="text-muted-foreground">{formatDate(leave.startDate)} – {formatDate(leave.endDate)}</span>
                </div>
                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reason</p>
                  <p className="mt-1 break-words text-xs text-foreground">{leave.reason || 'No reason provided'}</p>
                  {leave.isExceedingMonthlyQuota && <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-600"><AlertTriangle className="h-3 w-3" /> Monthly guideline exceeded</p>}
                </div>
                {activeScope === 'review' && leave.status === 'pending' ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                    <Button size="sm" variant="outline" onClick={() => void decideRequest(leave._id, 'deny')}>Deny</Button>
                    <Button size="sm" onClick={() => void decideRequest(leave._id, 'approve')}>Approve</Button>
                  </div>
                ) : leave.status === 'approved' ? <p className="mt-3 text-[11px] text-muted-foreground">Approved by {leave.approvedBy?.name || 'Manager'}</p> : leave.status === 'denied' ? <p className="mt-3 text-[11px] text-muted-foreground">Denied by {leave.deniedBy?.name || 'Manager'}{leave.denialReason ? ` · ${leave.denialReason}` : ''}</p> : null}
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
                        <Badge variant="outline" className="mr-2">{leave.requestType === 'remote' ? 'Remote' : 'Leave'}</Badge>
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
                      {leave.isExceedingMonthlyQuota && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium mt-0.5">
                          <AlertTriangle className="h-3 w-3" /> Exceeded 2 days/mo limit
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
                      ) : null}
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
      </div>
    </div>
  );
}
export default LeaveManagementTab;
