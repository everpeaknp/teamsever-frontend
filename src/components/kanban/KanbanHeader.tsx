'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KanbanHeaderProps {
  projectName: string;
  projectStatus?: 'active' | 'completed' | 'on-hold';
  members?: any[];
  onInviteMember?: () => void;
  onSettings?: () => void;
}

export function KanbanHeader({
  projectName,
  projectStatus = 'active',
  members = [],
  onInviteMember,
  onSettings,
}: KanbanHeaderProps) {
  const statusConfig = {
    active: { label: 'In Progress', color: '#135bec' },
    completed: { label: 'Completed', color: '#22c55e' },
    'on-hold': { label: 'On Hold', color: '#f97316' },
  };

  const status = statusConfig[projectStatus];
  const visibleMembers = members.slice(0, 3);
  const remainingCount = Math.max(0, members.length - 3);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex flex-col gap-6 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            {projectName}
          </h1>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="text-sm font-medium">Project Board</span>
            <span className="text-slate-300">•</span>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider"
              style={{
                backgroundColor: `${status.color}1A`,
                color: status.color,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              {status.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Avatar Group */}
          {members.length > 0 && (
            <div className="flex -space-x-3 overflow-hidden">
              {visibleMembers.map((member, index) => {
                const memberData = typeof member.user === 'string' ? member : member.user;
                const name = memberData?.name || 'Unknown';
                const avatar = memberData?.avatar;

                return (
                  <Avatar
                    key={index}
                    className="inline-block h-10 w-10 ring-2 ring-white dark:ring-slate-800"
                  >
                    {avatar && <AvatarImage src={avatar} alt={name} />}
                    <AvatarFallback className="text-xs bg-primary text-white">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {remainingCount > 0 && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium ring-2 ring-white dark:ring-slate-800 text-slate-600 dark:text-slate-300">
                  +{remainingCount}
                </div>
              )}
            </div>
          )}

          {onInviteMember && (
            <Button
              onClick={onInviteMember}
              className="bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>Invite Member</span>
            </Button>
          )}

          {onSettings && (
            <Button
              onClick={onSettings}
              variant="outline"
              size="icon"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
                settings
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
