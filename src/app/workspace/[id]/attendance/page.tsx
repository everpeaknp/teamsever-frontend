'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, CalendarDays, Clock3, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const sections = [
  { href: 'timesheets', title: 'Timesheets', description: 'Review attendance records and working hours.', icon: Clock3 },
  { href: 'leave-remote', title: 'Leave & remote requests', description: 'Track your requests and review assigned requests.', icon: CalendarDays },
  { href: 'presence', title: 'Presence & activity', description: 'See desktop app activity and tracking gaps.', icon: Activity },
  { href: 'locations', title: 'Locations & work modes', description: 'Manage attendance areas and work-mode assignments.', icon: MapPin },
];

export default function AttendancePage() {
  const workspaceId = useParams().id as string;
  return <main className="container mx-auto space-y-6 px-4 py-8 md:px-8">
    <header><h1 className="text-3xl font-bold tracking-tight">Attendance</h1><p className="mt-1 text-sm text-muted-foreground">Clock, timesheets, requests, presence, and work locations.</p></header>
    <section aria-label="Attendance sections" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map(({ href, title, description, icon: Icon }) => <Link key={href} href={`/workspace/${workspaceId}/attendance/${href}`} className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <Card className="h-full transition-colors group-hover:border-primary/50"><CardContent className="flex gap-4 p-5"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></span><span><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span></CardContent></Card>
      </Link>)}
    </section>
  </main>;
}
