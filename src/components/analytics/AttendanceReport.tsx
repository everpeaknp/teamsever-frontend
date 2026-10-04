'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Filter } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';
import { DesktopPresenceTimeline } from '@/components/attendance/DesktopPresenceTimeline';
import { AttendanceRecordsView } from './AttendanceRecordsView';
import type { AttendanceReportEntry } from './attendanceReportTypes';

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function AttendanceReport({ workspaceId }: { workspaceId: string }) {
  const { user, can } = useAuthStore();
  const [reportData, setReportData] = useState<AttendanceReportEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportError, setReportError] = useState('');
  const [period, setPeriod] = useState<string>('30d');
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: 'all'
  });

  // Check if current user is admin/owner
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!workspaceId || workspaceId === 'undefined') return;
      
      try {
        setLoading(true);
        // 1. Fetch Workspace to check roles and get members if admin
        const wsRes = await api.get(`/workspaces/${workspaceId}`);
        const workspace = wsRes.data.data;
        
        const myMember = workspace.members.find((m: any) => m.user._id === user?._id || m.user === user?._id);
        const adminStatus = myMember?.role === 'admin' || myMember?.role === 'owner' || workspace.owner === user?._id || can('MANAGE_ADDRESSES') || can('MANAGE_ATTENDANCE_LOCATIONS');
        setIsAdmin(adminStatus);

        if (adminStatus) {
           const membersRes = await api.get(`/workspaces/${workspaceId}/members`);
           setMembers(membersRes.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch attendance initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId && workspaceId !== 'undefined' && user) {
      fetchInitialData();
    }
  }, [workspaceId, user]);

  useEffect(() => {
    if (workspaceId && workspaceId !== 'undefined' && user) {
      fetchReport();
    }
  }, [workspaceId, user, filters.userId, filters.startDate, filters.endDate]);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    const end = new Date();
    let start = new Date();

    switch (val) {
      case '7d':
        start.setDate(end.getDate() - 7);
        setFilters({ ...filters, startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        setFilters({ ...filters, startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
        break;
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        setFilters({ ...filters, startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') });
        break;
      case 'lifetime':
        setFilters({ ...filters, startDate: '', endDate: '' });
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  const fetchReport = async () => {
    if (!workspaceId || workspaceId === 'undefined') return;

    try {
      setReportError('');
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId && filters.userId !== 'all') queryParams.append('userId', filters.userId);
      
      const response = await api.get(`/attendance/workspace/${workspaceId}/report?${queryParams.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setReportError((error as any)?.response?.data?.message || (error instanceof Error ? error.message : 'Failed to load the attendance report.'));
      toast.error('Failed to update report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId !== 'all') queryParams.append('userId', filters.userId);

      const response = await api.get(`/attendance/workspace/${workspaceId}/export?${queryParams.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${filters.startDate || 'Lifetime'}_to_${filters.endDate || 'Now'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const handleExportExcel = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId !== 'all') queryParams.append('userId', filters.userId);

      const response = await api.get(`/attendance/workspace/${workspaceId}/export-excel?${queryParams.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${filters.startDate || 'Lifetime'}_to_${filters.endDate || 'Now'}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('Failed to export to Excel');
    }
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="flex flex-col items-stretch justify-between gap-3 space-y-0 px-3.5 pb-2 pt-4 sm:flex-row sm:items-center sm:px-6 sm:pt-6">
          <CardTitle className="text-lg font-bold sm:text-xl">Attendance Report</CardTitle>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={handleExport} className="min-h-11 gap-2 px-3 sm:h-9 sm:min-h-9">
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="min-h-11 gap-2 px-3 sm:h-9 sm:min-h-9">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 px-3.5 pb-4 sm:px-6 sm:pb-6">
          <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:mb-6 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="h-11 min-h-11">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {period === 'custom' && (
              <>
                <div className="min-w-0 space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input 
                    type="date" 
                    className="h-11 min-w-0 px-2 text-sm sm:px-3"
                    value={filters.startDate} 
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input 
                    type="date" 
                    className="h-11 min-w-0 px-2 text-sm sm:px-3"
                    value={filters.endDate} 
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </>
            )}

            {isAdmin && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Member</label>
                <Select 
                  value={filters.userId} 
                  onValueChange={(val) => setFilters({...filters, userId: val})}
                >
                  <SelectTrigger className="h-11 min-h-11">
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex min-w-0 items-end min-[360px]:col-span-2 lg:col-span-1">
              <Button onClick={fetchReport} variant="outline" className="h-11 w-full gap-2" disabled={loading}>
                <Filter className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          <AttendanceRecordsView entries={reportData} loading={loading} error={reportError} onRetry={() => void fetchReport()} />
        </CardContent>
      </Card>
      <DesktopPresenceTimeline workspaceId={workspaceId} canViewTeam={isAdmin} />
    </div>
  );
}
