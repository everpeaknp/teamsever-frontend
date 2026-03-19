'use client';

import { CheckCircle2, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSpaceMetadata, useSpaceListsMetadata } from '@/hooks/queries/useSpace';

interface SpaceStatsProps {
  spaceId: string;
  spaceColor: string;
  onShowAllMembers: () => void;
  getInitials: (name: string) => string;
}

export function SpaceStats({ spaceId, spaceColor, onShowAllMembers, getInitials }: SpaceStatsProps) {
  const { data: space } = useSpaceMetadata(spaceId);
  const { data: lists = [] } = useSpaceListsMetadata(spaceId);

  if (!space) return null;

  // Calculate task stats from lists metadata
  const stats = lists.reduce(
    (acc: { totalTasks: number; completedTasks: number }, list: any) => {
      acc.totalTasks += list.taskCount || 0;
      acc.completedTasks += list.completedCount || 0;
      return acc;
    },
    { totalTasks: 0, completedTasks: 0 }
  );

  const percentage = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  // Count folders (lists with folderId)
  const folderCount = new Set(lists.filter((l: any) => l.folderId).map((l: any) => l.folderId)).size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Task Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold" style={{ color: spaceColor }}>{percentage}%</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.completedTasks} of {stats.totalTasks} tasks</p>
            </div>
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="none" className="text-muted" />
                <circle cx="32" cy="32" r="28" stroke={spaceColor} strokeWidth="6" fill="none" strokeDasharray={`${percentage * 1.76} 176`} className="transition-all duration-300" />
              </svg>
              <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6" style={{ color: spaceColor }} />
            </div>
          </div>
          <Progress value={percentage} className="h-2" style={{ backgroundColor: `${spaceColor}20` }} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{lists.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{folderCount} folders</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${spaceColor}20` }}>
              <FileText className="w-6 h-6" style={{ color: spaceColor }} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{space.members?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active members</p>
            </div>
            <div className="flex -space-x-2">
              {space.members?.slice(0, 3).map((member: any, idx: number) => {
                const user = typeof member.user === 'object' ? member.user : null;
                return (
                  <Avatar key={idx} className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110" onClick={onShowAllMembers}>
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="text-xs" style={{ backgroundColor: spaceColor, color: 'white' }}>
                      {user ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {space.members && space.members.length > 3 && (
                <Avatar className="w-8 h-8 border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110 bg-muted" onClick={onShowAllMembers}>
                  <AvatarFallback className="text-xs font-semibold">
                    +{space.members.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
