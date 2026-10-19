'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { Activity, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { api } from '@/lib/axios';
import { AttendanceReport } from '@/components/analytics/AttendanceReport';
import { LiveAttendanceTimers } from '@/components/attendance/LiveAttendanceTimers';
import { LeaveManagementTab } from '@/components/attendance/LeaveManagementTab';
import { AttendanceLocationSettings } from '@/components/attendance/AttendanceLocationSettings';

import { DesktopPresenceSettings } from '@/components/attendance/DesktopPresenceSettings';
import { DesktopPresenceTimeline } from '@/components/attendance/DesktopPresenceTimeline';

const sectionDetails: Record<string, { title: string; icon: typeof Clock3 }> = {
  timesheets: { title: 'Timesheets', icon: Clock3 },
  'leave-remote': { title: 'Leave & remote requests', icon: CalendarDays },
  presence: { title: 'Presence & activity', icon: Activity },
  locations: { title: 'Locations & work modes', icon: MapPin },
};

export default function AttendanceSectionPage() {
  const { id: workspaceId, section } = useParams<{ id: string; section: string }>();
  const [canManageLocations, setCanManageLocations] = useState(false);
  useEffect(() => {
    if (section !== 'locations') {
      setCanManageLocations(false);
      return;
    }
    let live = true;
    api.get(`/attendance/workspace/${workspaceId}/location-policy`).then((res) => {
      if (live) setCanManageLocations(!!res.data.data.canManage);
    }).catch(() => { if (live) setCanManageLocations(false); });
    return () => { live = false; };
  }, [workspaceId, section]);
  const detail = sectionDetails[section];
  if (!detail) notFound();
  if (section === 'locations' && !canManageLocations) return <main className="container mx-auto p-8"><h1 className="text-xl font-semibold">Locations & work modes</h1><p className="mt-2 text-muted-foreground">You don’t have permission to manage attendance locations.</p><Link className="mt-4 inline-block text-primary underline" href={`/workspace/${workspaceId}/attendance`}>Back to Attendance</Link></main>;
  const Icon = detail.icon;
  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <div><Link className="text-sm text-muted-foreground hover:text-foreground" href={`/workspace/${workspaceId}/attendance`}>Attendance</Link><div className="mt-3 flex items-center gap-3"><Icon className="h-6 w-6 text-primary"/><h1 className="text-3xl font-bold tracking-tight">{detail.title}</h1></div></div>
    {section === 'timesheets' && <><LiveAttendanceTimers workspaceId={workspaceId}/><AttendanceReport workspaceId={workspaceId}/></>}
    {section === 'leave-remote' && <LeaveManagementTab workspaceId={workspaceId}/>}
    {section === 'presence' && <><DesktopPresenceSettings workspaceId={workspaceId}/><DesktopPresenceTimeline workspaceId={workspaceId}/></>}
    {section === 'locations' && <AttendanceLocationSettings workspaceId={workspaceId}/>}
  </main>;
}
