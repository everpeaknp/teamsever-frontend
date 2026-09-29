'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AttendanceReport } from '@/components/analytics/AttendanceReport';
import { LeaveManagementTab } from '@/components/attendance/LeaveManagementTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CalendarDays } from 'lucide-react';

export default function AttendancePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [activeTab, setActiveTab] = useState('attendance');

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
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <AttendanceReport workspaceId={workspaceId} />
        </TabsContent>

        <TabsContent value="leaves" className="mt-0">
          <LeaveManagementTab workspaceId={workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
