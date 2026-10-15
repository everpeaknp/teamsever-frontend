'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, CalendarCheck2, Layers3, MessageCircle } from 'lucide-react';
import { MobileSidebar } from '@/components/sidebar/MobileSidebar';
import { matchesSidebarRoute } from '@/components/sidebar/sidebarRouteMatch';

const tabs = [
  { label: 'Dashboard', path: 'analytics', Icon: BarChart3 },
  { label: 'Spaces', path: 'spaces', Icon: Layers3 },
  { label: 'Messages', path: 'inbox', Icon: MessageCircle },
  { label: 'Attendance', path: 'attendance', Icon: CalendarCheck2 },
] as const;

export function MobileWorkspaceTabBar({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const pathname = usePathname();
  const isMessageRoute =
    matchesSidebarRoute(pathname, `/workspace/${workspaceId}/inbox`) ||
    matchesSidebarRoute(pathname, `/workspace/${workspaceId}/chat`);
  const isMoreRoute = ![
    'analytics',
    'spaces',
    'inbox',
    'chat',
    'attendance',
  ].some(path => matchesSidebarRoute(pathname, `/workspace/${workspaceId}/${path}`));

  return (
    <nav
      aria-label="Workspace navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {tabs.map(({ label, path, Icon }) => {
          const href = `/workspace/${workspaceId}/${path}`;
          const isActive = path === 'inbox'
            ? isMessageRoute
            : matchesSidebarRoute(pathname, href);

          return (
            <Link
              key={path}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <MobileSidebar
          variant="bottom"
          active={isMoreRoute}
        />
      </div>
    </nav>
  );
}
