'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, CalendarDays, Clock3, MapPin, Cpu, Compass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PlanFeatureGate } from '@/components/subscription/PlanFeatureGate';
import { useWorkspaceEntitlements } from '@/hooks/useWorkspaceEntitlements';

export default function AttendancePage() {
  const workspaceId = useParams().id as string;
  const { entitlements } = useWorkspaceEntitlements(workspaceId);

  const sections = [
    { href: 'timesheets', title: 'Timesheets', description: 'Review attendance records and working hours.', icon: Clock3, visible: true },
    { href: 'leave-remote', title: 'Leave & remote requests', description: 'Track your requests and review assigned requests.', icon: CalendarDays, visible: true },
    { 
      href: 'presence', 
      title: 'Presence & activity', 
      description: 'See desktop app activity and tracking gaps.', 
      icon: Activity, 
      visible: Boolean(entitlements?.modules.tracking.canUseDesktopTracking) 
    },
    { 
      href: 'locations', 
      title: 'Locations & work modes', 
      description: 'Manage geofenced attendance areas and office modes.', 
      icon: MapPin, 
      visible: Boolean(entitlements?.modules.attendance.canUseGeoFencing) 
    },
    { 
      href: 'terminals', 
      title: 'Physical Biometric Terminals', 
      description: 'ZKTeco, Hikvision and BioMax door devices and member PINs.', 
      icon: Cpu, 
      visible: Boolean(entitlements?.modules.attendance.canUsePhysicalTerminals) 
    },
    { 
      href: 'field-tracking', 
      title: 'Field GPS Visits', 
      description: 'Live field travel tracking and client site visit pins.', 
      icon: Compass, 
      visible: Boolean(entitlements?.modules.tracking.canUseFieldTracking) 
    },
  ].filter(s => s.visible !== false);

  return (
    <PlanFeatureGate
      workspaceId={workspaceId}
      moduleKey="attendance"
      featureName="Attendance & Time"
      description="Attendance tracking is not included in the current subscription plan for this workspace."
    >
      <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Clock, timesheets, requests, presence, and work locations.</p>
        </header>
        <section aria-label="Attendance sections" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={`/workspace/${workspaceId}/attendance/${href}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex gap-4 p-5">
                  <span className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </main>
    </PlanFeatureGate>
  );
}
