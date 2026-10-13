'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MessageModeNav({ workspaceId }: { workspaceId: string }) {
  const pathname = usePathname();
  const items = [
    { label: 'Direct Messages', href: `/workspace/${workspaceId}/inbox`, Icon: MessageSquareText },
    { label: 'Group Chat', href: `/workspace/${workspaceId}/chat`, Icon: MessageCircle },
  ];

  return (
    <nav aria-label="Message views" className="grid shrink-0 grid-cols-2 gap-2 border-b border-border bg-background px-3 py-2 md:hidden">
      {items.map(({ label, href, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-center text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="break-words">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
