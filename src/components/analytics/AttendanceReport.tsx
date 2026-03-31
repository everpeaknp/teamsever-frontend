'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Filter, User, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';

interface AttendanceEntry {
  id: string;
  userName: string;
  userEmail: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: string;
  durationFormatted: string;
  description: string;
}

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export function AttendanceReport({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuthStore();
  const [reportData, setReportData] = useState<AttendanceEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
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
      try {
        setLoading(true);
        // 1. Fetch Workspace to check roles and get members if admin
        const wsRes = await api.get(`/workspaces/${workspaceId}`);
        const workspace = wsRes.data.data;
        
        const myMember = workspace.members.find((m: any) => m.user._id === user?._id || m.user === user?._id);
        const adminStatus = myMember?.role === 'admin' || myMember?.role === 'owner' || workspace.owner === user?._id;
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

    if (workspaceId && user) {
      fetchInitialData();
    }
  }, [workspaceId, user]);

  useEffect(() => {
    if (workspaceId && user) {
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
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      if (filters.userId && filters.userId !== 'all') queryParams.append('userId', filters.userId);
      
      const response = await api.get(`/attendance/workspace/${workspaceId}/report?${queryParams.toString()}`);
      setReportData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Attendance Report</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <Download className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input 
                    type="date" 
                    value={filters.startDate} 
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input 
                    type="date" 
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
                  <SelectTrigger>
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
            
            <div className="flex items-end">
              <Button onClick={fetchReport} variant="outline" className="w-full gap-2" disabled={loading}>
                <Filter className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Clock className="w-5 h-5 animate-spin" />
                        Loading report data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No attendance records found for the selected period.
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {entry.userName ? entry.userName.charAt(0) : '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{entry.userName}</span>
                            <span className="text-xs text-muted-foreground">{entry.userEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          {entry.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {format(new Date(entry.clockIn), 'p')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={entry.clockOut.includes('Running') ? 'text-blue-500 font-bold animate-pulse' : 'text-rose-600 dark:text-rose-400 font-medium'}>
                          {entry.clockOut.includes('Running') ? (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                              Running
                            </div>
                          ) : format(new Date(entry.clockOut), 'p')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono">
                          <Clock className="w-3 h-3" />
                          {entry.durationFormatted}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
