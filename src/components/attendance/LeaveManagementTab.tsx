'use client';

import { useState, useEffect } from 'react';
import { Calendar, User, CheckCircle2, XCircle, Clock, AlertTriangle, Filter, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { api } from '@/lib/axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  status: 'pending' | 'approved' | 'denied';
  isExceedingMonthlyQuota?: boolean;
  createdAt: string;
}

export function LeaveManagementTab({ workspaceId }: { workspaceId: string }) {
  const [activeLeavesToday, setActiveLeavesToday] = useState<LeaveItem[]>([]);
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [remoteRequests, setRemoteRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const [todayRes, allRes, remoteRes] = await Promise.allSettled([
        api.get(`/workspaces/${workspaceId}/leaves/today`),
        api.get(`/workspaces/${workspaceId}/leaves`),
        api.get(`/workspaces/${workspaceId}/leaves/remote-requests`),
      ]);
      setActiveLeavesToday(todayRes.status === 'fulfilled' ? todayRes.value.data.data || [] : []);
      setLeaves(allRes.status === 'fulfilled' ? allRes.value.data.data || [] : []);
      setRemoteRequests(remoteRes.status === 'fulfilled' ? remoteRes.value.data.data || [] : []);
      if (todayRes.status === 'rejected' && allRes.status === 'rejected' && remoteRes.status === 'rejected') toast.error('You do not have permission to view attendance and leave records');
    } catch (err: any) {
      console.error('[LeaveManagementTab] Failed to fetch leaves:', err);
      toast.error('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  const decideRemoteRequest = async (requestId: string, decision: 'approve' | 'deny') => {
    const denialInput = decision === 'deny' ? window.prompt('Optional reason for denying this remote request:') : undefined;
    if (denialInput === null) return;
    const denialReason = denialInput?.trim();
    try {
      await api.patch(`/workspaces/${workspaceId}/leaves/${requestId}/${decision}`, { denialReason });
      toast.success(`Remote request ${decision === 'approve' ? 'approved' : 'denied'}`);
      await fetchLeaves();
    } catch (error: any) { toast.error(error.response?.data?.message || `Could not ${decision} remote request`); }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchLeaves();
    }
  }, [workspaceId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredLeaves = leaves.filter((leave) => {
    if (filterStatus !== 'all' && leave.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = leave.requester?.name?.toLowerCase().includes(q);
      const matchReason = leave.reason?.toLowerCase().includes(q);
      return matchName || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {remoteRequests.length > 0 && <section className="space-y-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 sm:p-5"><div><h3 className="text-sm font-bold">Pending Remote requests assigned to you</h3><p className="text-xs text-muted-foreground">Only the assigned approver and workspace owner can review. Proposed places stay private to them and the requester.</p></div>{remoteRequests.map((request) => <div key={request._id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-card p-3"><div className="min-w-0 space-y-1"><p className="text-sm font-semibold">{request.requester?.name} · {formatDate(request.startDate)} → {formatDate(request.endDate)}</p><p className="text-xs">{request.remoteAreaName || request.proposedRemoteArea?.name || 'Private remote place'}</p>{request.proposedRemoteArea && <p className="text-xs text-muted-foreground">Proposed pin: {request.proposedRemoteArea.latitude.toFixed(5)}, {request.proposedRemoteArea.longitude.toFixed(5)} · 60 m allowed radius</p>}<p className="text-xs text-muted-foreground">{request.reason}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => void decideRemoteRequest(request._id, 'approve')}>Approve</Button><Button size="sm" variant="outline" onClick={() => void decideRemoteRequest(request._id, 'deny')}>Deny</Button></div></div>)}</section>}
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
        {/* Filter bar */}
        <div className="p-4 border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by member or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            {(['all', 'pending', 'approved', 'denied'] as const).map((st) => (
              <Button
                key={st}
                type="button"
                variant={filterStatus === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(st)}
                className="h-8 text-xs capitalize rounded-lg"
              >
                {st}
              </Button>
            ))}
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
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-semibold border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Duration & Dates</th>
                  <th className="px-4 py-3">Explicit Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approver / Decision</th>
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
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {leave.status === 'approved' && (
                        <span>By {leave.approvedBy?.name || 'Manager'}</span>
                      )}
                      {leave.status === 'denied' && (
                        <div>
                          <span>By {leave.deniedBy?.name || 'Manager'}</span>
                          {leave.denialReason && (
                            <p className="text-[10px] text-rose-400 italic mt-0.5 truncate max-w-xs" title={leave.denialReason}>
                              &quot;{leave.denialReason}&quot;
                            </p>
                          )}
                        </div>
                      )}
                      {leave.status === 'pending' && (
                        <span>Assigned: {leave.assignedManager?.name}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default LeaveManagementTab;
