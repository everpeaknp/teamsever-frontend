'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';

interface ClockInOutProps {
  workspaceId: string;
  currentStatus: 'active' | 'inactive';
  runningTimer: any;
  onStatusChange: (force?: boolean) => void;
}

export function ClockInOut({ workspaceId, currentStatus, runningTimer, onStatusChange }: ClockInOutProps) {
  const [loading, setLoading] = useState(false);

  const handleClockToggle = async () => {
    if (!workspaceId) {
      toast.error("Workspace ID is missing");
      return;
    }

    try {
      setLoading(true);
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      
      console.log('[ClockInOut] Toggling clock:', { 
        from: currentStatus, 
        to: newStatus,
        workspaceId 
      });

      const response = await api.post(`/workspaces/${workspaceId}/clock/toggle`, {
        status: newStatus
      });
      
      console.log('[ClockInOut] Toggle response:', response.data);

      if (response.data.success) {
        // Refresh parent data to get updated status from server (force refresh to clear cache)
        onStatusChange(true);

        const message = newStatus === 'active' ? 'Clocked in successfully!' : 'Clocked out successfully!';
        console.log('[ClockInOut] Success:', message);
        toast.success(message);
      } else {
        throw new Error('Toggle failed');
      }
    } catch (error: any) {
      console.error('[ClockInOut] Failed to toggle clock status:', error);
      console.error('[ClockInOut] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const clockedIn = currentStatus === 'active';

  return (
    <Card>
      <div className="px-6 py-4 border-b">
        <h4 className="font-bold">Time Tracking</h4>
      </div>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className={`p-4 rounded-full mb-4 ${clockedIn ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-900/20'}`}>
            <Clock className={`w-8 h-8 ${clockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`} />
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            {clockedIn ? 'You are currently clocked in' : 'You are currently clocked out'}
          </p>

          <Button
            type="button"
            onClick={handleClockToggle}
            disabled={loading}
            className={`w-full gap-2 ${clockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                {clockedIn ? 'Clocking Out...' : 'Clocking In...'}
              </>
            ) : clockedIn ? (
              <>
                <LogOut className="w-4 h-4" />
                Clock Out
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Clock In
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
