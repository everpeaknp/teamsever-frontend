'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

const RemoteLocationMap = dynamic(() => import('./RemoteLocationMap').then((module) => module.RemoteLocationMap), { ssr: false, loading: () => <div className="h-36 w-full animate-pulse rounded-md bg-muted" /> });

interface LeaveCardProps {
  message: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      name: string;
      avatar?: string;
      profilePicture?: string;
    };
    metadata?: {
      leaveRequestId?: string;
      requestType?: 'leave' | 'remote';
      proposedRemoteArea?: { name?: string; latitude?: number; longitude?: number };
      remoteLocation?: { name?: string; latitude?: number; longitude?: number };
      remoteAreaName?: string;
      startDate?: string;
      endDate?: string;
      daysCount?: number;
      reason?: string;
      status?: 'pending' | 'approved' | 'denied';
      approvedBy?: { _id: string; name: string };
      approvedAt?: string;
      deniedBy?: { _id: string; name: string };
      deniedAt?: string;
      denialReason?: string;
      isExceedingMonthlyQuota?: boolean;
      monthlyLeaveCountAtRequest?: number;
    };
    createdAt: string;
  };
  currentUserId: string;
  canManageLeaves: boolean;
  isWorkspaceOwner: boolean;
  isDirectConversation: boolean;
  workspaceId: string;
  onStatusUpdated?: () => void;
}

export function LeaveCard({
  message,
  currentUserId,
  canManageLeaves,
  isWorkspaceOwner,
  isDirectConversation,
  workspaceId,
  onStatusUpdated,
}: LeaveCardProps) {
  const meta = message.metadata || {};
  const status = meta.status || 'pending';
  const leaveRequestId = meta.leaveRequestId;
  const isRemoteRequest = meta.requestType === 'remote';
  const remoteLocation = meta.remoteLocation || meta.proposedRemoteArea;
  const hasRemoteCoordinates = remoteLocation?.latitude != null && remoteLocation.longitude != null;

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDenyPopover, setShowDenyPopover] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  const isRequester = message.sender._id === currentUserId;
  // Leave requests are created in a private DM with exactly the requester and
  // the assigned approver. The server remains the authority for each decision;
  // this lets the recipient see the controls before workspace permissions hydrate.
  const canDecide = status === 'pending' && (
    (isDirectConversation && !isRequester) ||
    (canManageLeaves && (!isRequester || isWorkspaceOwner))
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleApprove = async () => {
    if (!leaveRequestId || isProcessing) return;
    setIsProcessing(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/leaves/${leaveRequestId}/approve`);
      toast.success(`${isRemoteRequest ? 'Remote work' : 'Leave'} request approved!`);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve leave');
      onStatusUpdated?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!leaveRequestId || isProcessing) return;
    setIsProcessing(true);
    try {
      await api.patch(`/workspaces/${workspaceId}/leaves/${leaveRequestId}/deny`, {
        denialReason: denialReason.trim() || undefined,
      });
      toast.success('Leave request denied');
      setShowDenyPopover(false);
      setDenialReason('');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deny leave');
      onStatusUpdated?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div data-testid="leave-request-card" className="my-1 w-full min-w-0 max-w-[min(100%,32rem)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      {/* Top Banner / Status */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm font-semibold',
          status === 'pending' && 'border-border bg-muted/40',
          status === 'approved' && 'border-border bg-muted/40',
          status === 'denied' && 'border-border bg-muted/40'
        )}
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          <span>{isRemoteRequest ? 'Remote Work Request' : 'Leave Request'}</span>
        </div>

        <div className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
          status === 'pending' && 'border-amber-500/25 bg-amber-500/10 text-amber-500',
          status === 'approved' && 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
          status === 'denied' && 'border-rose-500/25 bg-rose-500/10 text-rose-500'
        )}>
          {status === 'pending' && (
            <>
              <Clock className="h-3.5 w-3.5" />
              <span>Pending</span>
            </>
          )}
          {status === 'approved' && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approved</span>
            </>
          )}
          {status === 'denied' && (
            <>
              <XCircle className="h-3.5 w-3.5" />
              <span>Denied</span>
            </>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-3 px-3 py-3 text-xs sm:space-y-4 sm:px-4 sm:py-4">
        {/* Requester & Date Range */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-muted-foreground">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{message.sender.name}</span>
            <span className="text-[11px]">
              {formatDate(meta.startDate)}{meta.endDate && meta.endDate !== meta.startDate ? ` – ${formatDate(meta.endDate)}` : ''}
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">{meta.daysCount || 1} day{(meta.daysCount || 1) === 1 ? '' : 's'}</span>
        </div>

        {isRemoteRequest && <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remote work location</span>
            <p className="mt-0.5 text-sm font-medium text-foreground">{remoteLocation?.name || meta.remoteAreaName || 'Approved private place'}</p>
          </div>
          {hasRemoteCoordinates ? <>
            <div className="relative isolate z-0 min-w-0 overflow-hidden rounded-lg">
              {!isMapExpanded && <RemoteLocationMap latitude={remoteLocation.latitude!} longitude={remoteLocation.longitude!} className="h-28 sm:h-36" />}
              <div className="flex min-w-0 items-center justify-between gap-2 pt-2">
                <span className="min-w-0 break-words text-[10px] leading-snug text-muted-foreground">
                  {remoteLocation.latitude!.toFixed(5)}, {remoteLocation.longitude!.toFixed(5)} · private to this DM
                </span>
                <Button type="button" variant="outline" size="sm" aria-label="Expand map" onClick={() => setIsMapExpanded(true)} className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
                  <Maximize2 className="h-3.5 w-3.5" /> Map
                </Button>
              </div>
            </div>
            <Dialog open={isMapExpanded} onOpenChange={setIsMapExpanded}>
              <DialogContent aria-label={`${remoteLocation.name || 'Requested remote location'} map`} className="z-[70] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto p-3 sm:p-5">
                <DialogHeader>
                  <DialogTitle>{remoteLocation.name || 'Requested remote location'}</DialogTitle>
                  <DialogDescription>Map of the location shared in this remote work request.</DialogDescription>
                </DialogHeader>
                <RemoteLocationMap latitude={remoteLocation.latitude!} longitude={remoteLocation.longitude!} className="h-[min(68dvh,42rem)]" />
                <p className="text-xs text-muted-foreground">{remoteLocation.latitude!.toFixed(5)}, {remoteLocation.longitude!.toFixed(5)} · shared in this DM only</p>
              </DialogContent>
            </Dialog>
          </> : <p className="mt-2 rounded bg-muted/60 px-2 py-3 text-xs text-muted-foreground">Map coordinates are unavailable for this request.</p>}
        </div>}

        {/* Reason (Compulsory) */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reason</span>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
            {meta.reason || message.content}
          </p>
        </div>

        {/* 2-Day Warning Badge if exceeded */}
        {meta.isExceedingMonthlyQuota && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Limit Warning:</strong> Exceeds 2-day monthly guideline ({meta.monthlyLeaveCountAtRequest || 0} approved days already on record).
            </span>
          </div>
        )}

        {/* Denial Note if Denied */}
        {status === 'denied' && meta.denialReason && (
          <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
            <span className="font-semibold block text-[10px] uppercase">Reason for Denial</span>
            <p className="mt-0.5 text-foreground/80">{meta.denialReason}</p>
          </div>
        )}

        {/* Status resolved footer */}
        {status === 'approved' && meta.approvedBy && (
          <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Approved by {meta.approvedBy.name}{meta.approvedAt ? ` · ${new Date(meta.approvedAt).toLocaleDateString()}` : ''}
          </div>
        )}
        {status === 'denied' && meta.deniedBy && (
          <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            Denied by {meta.deniedBy.name}{meta.deniedAt ? ` · ${new Date(meta.deniedAt).toLocaleDateString()}` : ''}
          </div>
        )}

        {/* Action Buttons for Managers with MANAGE_LEAVES permission */}
        {canDecide && (
          <div className="flex items-center gap-2 border-t border-border/60 pt-3">
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>

            <Popover open={showDenyPopover} onOpenChange={setShowDenyPopover}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isProcessing}
                  className="flex-1 h-8 text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 font-semibold gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Deny
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 space-y-2.5 bg-card border-border" align="end">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-foreground">Deny Leave Request</span>
                  <p className="text-[11px] text-muted-foreground">Reason for denial (optional):</p>
                </div>
                <Textarea
                  placeholder="Optional reason for denying..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={2}
                  className="text-xs resize-none bg-muted/40"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setShowDenyPopover(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    onClick={handleDeny}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm Deny'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {status === 'pending' && isRequester && !isWorkspaceOwner && (
          <div className="rounded bg-muted/20 px-2 py-1.5 text-center text-[11px] text-muted-foreground">
            You sent this request. The assigned approver can approve or deny it in the{' '}
            <a className="font-medium text-primary underline underline-offset-2" href={`/workspace/${workspaceId}/attendance/leave-remote`}>
              Review inbox
            </a>.
          </div>
        )}
        {status === 'pending' && !isRequester && !canDecide && (
          <div className="rounded bg-muted/20 px-2 py-1.5 text-center text-[11px] text-muted-foreground">
            Only the assigned approver or a workspace owner can approve or deny this request. Open the{' '}
            <a className="font-medium text-primary underline underline-offset-2" href={`/workspace/${workspaceId}/attendance/leave-remote`}>
              Review inbox
            </a>.
          </div>
        )}
      </div>
    </div>
  );
}
export default LeaveCard;
