'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  assignedManagerId: string;
  conversationId?: string;
  managerName: string;
  onRequestSubmitted?: () => void;
}

export function RequestLeaveModal({
  isOpen,
  onClose,
  workspaceId,
  assignedManagerId,
  conversationId,
  managerName,
  onRequestSubmitted,
}: RequestLeaveModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [quotaChecking, setQuotaChecking] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    approvedDaysThisMonth: number;
    standardLimit: number;
    isExceeded: boolean;
  } | null>(null);

  // Set default dates on open (tomorrow)
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setStartDate(tomorrowStr);
      setEndDate(tomorrowStr);
      setReason('');

      // Check quota
      setQuotaChecking(true);
      api
        .get(`/workspaces/${workspaceId}/leaves/my-quota?date=${tomorrowStr}`)
        .then((res) => {
          setQuotaInfo(res.data.data);
        })
        .catch((err) => {
          console.error('[RequestLeaveModal] Failed to fetch quota:', err);
        })
        .finally(() => {
          setQuotaChecking(false);
        });
    }
  }, [isOpen, workspaceId]);

  // Calculate day difference
  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diff = Math.abs(end.getTime() - start.getTime());
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const daysRequested = calculateDays();
  const willExceedQuota =
    quotaInfo && (quotaInfo.approvedDaysThisMonth >= 2 || quotaInfo.approvedDaysThisMonth + daysRequested > 2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Please specify both start and end dates');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date cannot be earlier than start date');
      return;
    }

    if (!reason.trim()) {
      toast.error('Leave reason is compulsory');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/workspaces/${workspaceId}/leaves`, {
        assignedManagerId,
        conversationId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason.trim(),
      });

      toast.success('Leave request submitted to ' + managerName);
      if (onRequestSubmitted) onRequestSubmitted();
      onClose();
    } catch (err: any) {
      console.error('[RequestLeaveModal] Failed to submit leave request:', err);
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold">Request Leave</DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Submitting directly in DM with <strong className="text-foreground">{managerName}</strong>
          </p>
        </DialogHeader>

        {/* 2-Day Monthly Limit Warning Banner */}
        {willExceedQuota && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice: Monthly Guideline Exceeded</p>
              <p className="text-amber-500/90 mt-0.5">
                You have already taken {quotaInfo?.approvedDaysThisMonth || 0} leave day(s) this month.
                Requesting {daysRequested} day(s) will exceed the standard 2 days/month threshold.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="text-xs h-9 bg-muted/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="text-xs h-9 bg-muted/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
            <span>Duration:</span>
            <span className="font-bold text-foreground">
              {daysRequested} day{daysRequested > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Reason for Leave <span className="text-destructive font-bold">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">Compulsory</span>
            </div>
            <Textarea
              placeholder="Explicit reason for taking leave (e.g. personal emergency, family function, health recovery)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="text-xs resize-none bg-muted/40 focus-visible:ring-primary"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading || !reason.trim()} className="gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Leave Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default RequestLeaveModal;
