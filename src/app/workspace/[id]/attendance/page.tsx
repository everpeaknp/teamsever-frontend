'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AttendanceReport } from '@/components/analytics/AttendanceReport';
import { LeaveManagementTab } from '@/components/attendance/LeaveManagementTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CalendarDays, MapPin, Activity } from 'lucide-react';
import { api } from '@/lib/axios';
import { AttendanceLocationSettings } from '@/components/attendance/AttendanceLocationSettings';
import { LocationReviewPanel } from '@/components/attendance/LocationReviewPanel';
import { LocationSessionMonitor } from '@/components/attendance/LocationSessionMonitor';
import { DesktopAttendanceControls } from '@/components/analytics/DesktopAttendanceControls';
import { DesktopPresenceSettings } from '@/components/attendance/DesktopPresenceSettings';
import { DesktopPresenceTimeline } from '@/components/attendance/DesktopPresenceTimeline';

export default function AttendancePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [activeTab, setActiveTab] = useState('attendance');
  const [canManageLocations, setCanManageLocations] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get(`/attendance/workspace/${workspaceId}/location-policy`).then((response) => {
      if (!cancelled) setCanManageLocations(!!response.data.data.canManage);
    }).catch(() => { if (!cancelled) setCanManageLocations(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Attendance & Leaves</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View clock-in/out records, timesheets, and team leave management.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="attendance" className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background">
            <Clock className="h-4 w-4" />
            Timesheets & Clocks
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background">
            <CalendarDays className="h-4 w-4" />
            Leave Management & Records
          </TabsTrigger>
          <TabsTrigger value="presence" className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background"><Activity className="h-4 w-4" />Presence & Activity</TabsTrigger>
          {canManageLocations && <TabsTrigger value="locations" className="rounded-lg gap-2 text-xs font-semibold data-[state=active]:bg-background"><MapPin className="h-4 w-4" />Locations & Assignments</TabsTrigger>}
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <LocationSessionMonitor workspaceId={workspaceId} />
          <AttendanceReport workspaceId={workspaceId} />
          <div className="mt-6"><LocationReviewPanel workspaceId={workspaceId} /></div>
        </TabsContent>

        <TabsContent value="leaves" className="mt-0">
          <LeaveManagementTab workspaceId={workspaceId} />
        </TabsContent>
        <TabsContent value="presence" className="mt-0 space-y-6">
          <DesktopAttendanceControls />
          <DesktopPresenceSettings workspaceId={workspaceId} />
          <DesktopPresenceTimeline workspaceId={workspaceId} canViewTeam={canManageLocations} />
        </TabsContent>
        {canManageLocations && <TabsContent value="locations" className="mt-0"><AttendanceLocationSettings workspaceId={workspaceId} /></TabsContent>}
      </Tabs>
    </div>
  );
}
