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
      toast.success('Leave request approved!');
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      console.error('[LeaveCard] Approve error:', err);
      toast.error(err.response?.data?.message || 'Failed to approve leave');
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
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-sm overflow-hidden text-card-foreground my-1.5 transition-all">
      {/* Top Banner / Status */}
      <div
        className={cn(
          'flex items-center justify-between px-3.5 py-2 text-xs font-semibold border-b',
          status === 'pending' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          status === 'approved' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          status === 'denied' && 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        )}
      >
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          <span>Leave Request</span>
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
      <div className="p-3.5 space-y-2.5 text-xs">
        {/* Requester & Date Range */}
        <div className="flex items-center justify-between text-muted-foreground pb-2 border-b border-border/50">
          <div>
            <span className="text-foreground font-semibold">{message.sender.name}</span>
            <span className="block text-[11px] text-muted-foreground">
              {formatDate(meta.startDate)} → {formatDate(meta.endDate)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-foreground">{meta.daysCount || 1}</span>
            <span className="block text-[10px] text-muted-foreground">
              day{(meta.daysCount || 1) > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Reason (Compulsory) */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason</span>
          <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap bg-muted/30 p-2 rounded-md border border-border/40">
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
          <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
            <span>Approved by {meta.approvedBy.name}</span>
            {meta.approvedAt && <span>{new Date(meta.approvedAt).toLocaleDateString()}</span>}
          </div>
        )}
        {status === 'denied' && meta.deniedBy && (
          <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between">
            <span>Denied by {meta.deniedBy.name}</span>
            {meta.deniedAt && <span>{new Date(meta.deniedAt).toLocaleDateString()}</span>}
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
