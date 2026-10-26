'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DesktopAppIcon } from '@/components/attendance/DesktopAppIcon';
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/axios';
import { formatAppLabel } from '@/components/attendance/desktopAppUsage';

type CurrentDesktopPresence = {
  appId: string;
  presenceStatus: 'active' | 'afk';
};

interface TeamAvailabilityProps {
  members: any[];
  workspaceId: string;
}

export function TeamAvailability({ members, workspaceId }: TeamAvailabilityProps) {
  const [expanded, setExpanded] = useState(false);
  const [desktopPresence, setDesktopPresence] = useState<Record<string, CurrentDesktopPresence>>({});
  const presenceRequest = useRef(0);
  const COLLAPSED_COUNT = 6;

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40">Clocked In</Badge>;
      case 'break':
        return <Badge className="bg-amber-50 text-amber-600 dark:bg-amber-900/20">On Break</Badge>;
      default:
        return <Badge variant="outline">Clocked Out</Badge>;
    }
  };

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a: any, b: any) => {
        const aStatus = a?.status === 'active' ? 1 : 0;
        const bStatus = b?.status === 'active' ? 1 : 0;
        return bStatus - aStatus;
      }),
    [members]
  );

  const displayMembers = expanded
    ? sortedMembers
    : sortedMembers.slice(0, COLLAPSED_COUNT);

  const activeUserIds = useMemo(() => Array.from(new Set(sortedMembers
    .filter((member: any) => ['active', 'break', 'clocked in', 'on break'].includes(String(member?.status || '').toLowerCase()))
    .map((member: any) => {
      const user = typeof member.user === 'object' ? member.user : member;
      return user?._id || user?.id || member?.userId;
    })
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))), [sortedMembers]);
  const activeUserIdsKey = activeUserIds.join(',');

  useEffect(() => {
    const requestId = ++presenceRequest.current;
    if (!workspaceId || activeUserIds.length === 0) {
      setDesktopPresence({});
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const refresh = async () => {
      if (cancelled || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const query = new URLSearchParams({ userIds: activeUserIdsKey, pageSize: String(activeUserIds.length) });
        const { data } = await api.get(`/attendance/workspace/${workspaceId}/desktop-presence/current?${query}`, {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (cancelled || requestId !== presenceRequest.current) return;
        const next: Record<string, CurrentDesktopPresence> = {};
        const roster = data?.data?.members;
        if (Array.isArray(roster)) {
          for (const item of roster) {
            const presence = item?.presence;
            if (typeof item?.userId === 'string'
              && typeof presence?.appId === 'string'
              && presence.appId.trim()
              && (presence.presenceStatus === 'active' || presence.presenceStatus === 'afk')) {
              next[item.userId] = { appId: presence.appId, presenceStatus: presence.presenceStatus };
            }
          }
        }
        setDesktopPresence((current) => {
          const currentIds = Object.keys(current);
          const nextIds = Object.keys(next);
          if (currentIds.length === nextIds.length && nextIds.every((id) =>
            current[id]?.appId === next[id].appId &&
            current[id]?.presenceStatus === next[id].presenceStatus
          )) return current;
          return next;
        });
      } catch {
        // Desktop reporting is optional; clock-in state stays available.
      } finally {
        inFlight = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    refreshWhenVisible();
    const poll = window.setInterval(refreshWhenVisible, 5_000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      presenceRequest.current += 1;
    };
  }, [workspaceId, activeUserIdsKey, activeUserIds.length]);

  return (
    <Card className="flex flex-col">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h4 className="font-bold">Team Availability</h4>
        <span className="text-xs text-muted-foreground">Live Now</span>
      </div>
      <CardContent className="p-6 space-y-4 flex-grow">
        {displayMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No team members</p>
          </div>
        ) : (
          displayMembers.map((member: any, index: number) => {
            const user = typeof member.user === 'object' ? member.user : member;
            const userName = user?.name || 'Unknown';
            const userId = user?._id || user?.id || member?.userId;
            const presence = typeof userId === 'string' ? desktopPresence[userId] : undefined;
            const appLabel = presence?.appId ? formatAppLabel(presence.appId) : null;
            
            return (
              <div key={member._id || user?._id || `${userName}-${index}`} className="flex min-w-0 flex-col items-stretch gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between">
                <div className="flex w-full min-w-0 items-center gap-3 min-[400px]:flex-1">
                  <div className="relative">
                    <UserAvatar 
                      user={user} 
                      className="w-10 h-10" 
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-800 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-500' : 
                      member.status === 'break' ? 'bg-amber-500' : 'bg-slate-300'
                    }`}></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{userName}</p>
                    {getStatusBadge(member.status || 'inactive')}
                  </div>
                </div>
                {appLabel && <div
                  className="flex w-full min-w-0 flex-col items-start gap-1 text-xs text-muted-foreground min-[400px]:w-[46%] min-[400px]:shrink-0 min-[400px]:items-end"
                  title={'Currently using ' + appLabel + (presence?.presenceStatus === 'afk' ? ' · Away' : '')}
                  aria-label={'Currently using ' + appLabel + (presence?.presenceStatus === 'afk' ? ', away' : '')}
                >
                  <span className="text-[11px] leading-4">Currently using</span>
                  <span className="flex min-w-0 max-w-full items-center justify-start gap-1.5 min-[400px]:justify-end">
                    <DesktopAppIcon appId={presence!.appId} label={appLabel} className="h-5 w-5 shrink-0 border-0 bg-transparent shadow-none" />
                    <span className="min-w-0 whitespace-normal break-words min-[400px]:text-right">{appLabel}{presence?.presenceStatus === 'afk' ? ' · Away' : ''}</span>
                  </span>
                </div>}
              </div>
            );
          })
        )}

        {sortedMembers.length > COLLAPSED_COUNT && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded
                ? `Show Less`
                : `Show All (${sortedMembers.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
