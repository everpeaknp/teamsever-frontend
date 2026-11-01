'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Bell, BriefcaseBusiness, CalendarCheck2, FileText, Folder, HeartHandshake, Palette, Settings2, ShieldCheck, Users } from 'lucide-react';
import { useWorkspaceEntitlements } from '@/hooks/useWorkspaceEntitlements';

export default function MorePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { canAccessAttendance, canAccessHr, canAccessQuality } = useWorkspaceEntitlements(workspaceId);

  const tools = [
    { label: 'Documents', path: 'docs', Icon: FileText, visible: true },
    { label: 'Quality', path: 'quality', Icon: ShieldCheck, visible: canAccessQuality },
    { label: 'Attendance', path: 'attendance', Icon: CalendarCheck2, visible: canAccessAttendance },
    { label: 'Human Resources', path: 'hr', Icon: BriefcaseBusiness, visible: canAccessHr },
    { label: 'My HR & payslips', path: 'hr/me', Icon: BriefcaseBusiness, visible: canAccessHr },
    { label: 'Team engagement', path: 'hr/engagement', Icon: HeartHandshake, visible: canAccessHr },
    { label: 'Notifications', path: 'notifications', Icon: Bell, visible: true },
    { label: 'Workspace settings', path: 'settings', Icon: Settings2, visible: true },
    { label: 'Members', path: 'settings/members', Icon: Users, visible: true },
  ].filter(t => t.visible);

  return <main className="min-h-full overflow-y-auto bg-background px-4 pb-28 pt-6 sm:px-6 lg:mx-auto lg:max-w-4xl lg:pt-10">
    <section aria-labelledby="account-tools-heading">
      <h1 id="account-tools-heading" className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link href="/account" className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Users className="h-4 w-4" /></span>Profile</Link>
        <Link href={`/workspace/${workspaceId}/settings`} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Palette className="h-4 w-4" /></span>Preferences</Link>
      </div>
    </section>
    <section aria-labelledby="workspace-tools-heading" className="mt-7">
      <h2 id="workspace-tools-heading" className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace tools</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link href={`/workspace/${workspaceId}/files`} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Folder className="h-4 w-4" /></span>Files</Link>
        {tools.map(({ label, path, Icon }) => <Link key={path} href={`/workspace/${workspaceId}/${path}`} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-card px-3 text-sm font-medium hover:bg-muted"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="truncate">{label}</span></Link>)}
      </div>
    </section>
  </main>;
}
