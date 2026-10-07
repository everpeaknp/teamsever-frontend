'use client';

import { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

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
  workspaceId: string;
  onStatusUpdated?: () => void;
}

export function LeaveCard({
  message,
  currentUserId,
  canManageLeaves,
  isWorkspaceOwner,
  workspaceId,
  onStatusUpdated,
}: LeaveCardProps) {
  const meta = message.metadata || {};
  const status = meta.status || 'pending';
  const leaveRequestId = meta.leaveRequestId;
  const isRemoteRequest = meta.requestType === 'remote';
  const remoteLocation = meta.remoteLocation || meta.proposedRemoteArea;
  const remoteMapUrl = remoteLocation?.latitude != null && remoteLocation.longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${remoteLocation.longitude - 0.008},${remoteLocation.latitude - 0.005},${remoteLocation.longitude + 0.008},${remoteLocation.latitude + 0.005}&layer=mapnik&marker=${remoteLocation.latitude},${remoteLocation.longitude}`
    : undefined;

  const [isProcessing, setIsProcessing] = useState(false);
  const [showDenyPopover, setShowDenyPopover] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  const isRequester = message.sender._id === currentUserId;

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
      console.error('[LeaveCard] Approve error:', err);
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
      console.error('[LeaveCard] Deny error:', err);
      toast.error(err.response?.data?.message || 'Failed to deny leave');
      onStatusUpdated?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div data-testid="leave-request-card" className="w-fit max-w-[min(82vw,30rem)] rounded-xl border border-border bg-card shadow-sm overflow-hidden text-card-foreground my-1 transition-all">
      {/* Top Banner / Status */}
      <div
        className={cn(
          'flex items-center justify-between gap-4 px-3 py-1.5 text-xs font-semibold border-b',
          status === 'pending' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          status === 'approved' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          status === 'denied' && 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        )}
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>{isRemoteRequest ? 'Remote Work Request' : 'Leave Request'}</span>
        </div>

        <div className="flex items-center gap-1">
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
      <div className="px-3 py-2.5 space-y-2 text-xs">
        {/* Requester & Date Range */}
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <div className="min-w-0">
            <span className="font-semibold text-foreground">{message.sender.name}</span>
            <span className="ml-2 whitespace-nowrap text-[11px]">
              {formatDate(meta.startDate)}{meta.endDate && meta.endDate !== meta.startDate ? ` – ${formatDate(meta.endDate)}` : ''}
            </span>
          </div>
          <span className="shrink-0 text-[11px]">{meta.daysCount || 1}d</span>
        </div>

        {isRemoteRequest && <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Private remote place</span><p className="mt-0.5 text-xs">{remoteLocation?.name || meta.remoteAreaName || 'Existing approved private place'}</p>{remoteMapUrl && <iframe title={`Map pin for ${remoteLocation?.name || 'requested remote location'}`} src={remoteMapUrl} className="mt-2 h-36 w-full rounded-md border-0 bg-muted" loading="lazy" referrerPolicy="no-referrer" />}{remoteLocation?.latitude != null && remoteLocation.longitude != null && <p className="mt-1 text-[10px] text-muted-foreground">{remoteLocation.latitude.toFixed(5)}, {remoteLocation.longitude.toFixed(5)} · shared in this DM only</p>}</div>}

        {/* Reason (Compulsory) */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</span>
          <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
            {meta.reason || message.content}
          </p>
        </div>

        {/* 2-Day Warning Badge if exceeded */}
        {meta.isExceedingMonthlyQuota && (
          <div className="flex items-start gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] leading-tight">
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
          <div className="text-[10px] text-muted-foreground">
            Approved by {meta.approvedBy.name}{meta.approvedAt ? ` · ${new Date(meta.approvedAt).toLocaleDateString()}` : ''}
          </div>
        )}
        {status === 'denied' && meta.deniedBy && (
          <div className="text-[10px] text-muted-foreground">
            Denied by {meta.deniedBy.name}{meta.deniedAt ? ` · ${new Date(meta.deniedAt).toLocaleDateString()}` : ''}
          </div>
        )}

        {/* Action Buttons for Managers with MANAGE_LEAVES permission */}
        {status === 'pending' && canManageLeaves && (!isRequester || isWorkspaceOwner) && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
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

        {/* If pending and user is the requester without manage leave */}
        {status === 'pending' && !canManageLeaves && isRequester && (
          <div className="text-[11px] text-muted-foreground text-center py-1 bg-muted/20 rounded">
            Awaiting manager approval
          </div>
        )}
      </div>
    </div>
  );
}
export default LeaveCard;
