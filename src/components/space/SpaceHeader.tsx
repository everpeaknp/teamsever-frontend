'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, UserPlus, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSpaceMetadata } from '@/hooks/queries/useSpace';

interface SpaceHeaderProps {
  spaceId: string;
  workspaceId: string;
  shouldShowAdminButtons: boolean;
  onInviteClick: () => void;
  onSettingsClick: () => void;
}

export function SpaceHeader({ 
  spaceId, 
  workspaceId, 
  shouldShowAdminButtons,
  onInviteClick,
  onSettingsClick 
}: SpaceHeaderProps) {
  const router = useRouter();
  const { data: space, isLoading } = useSpaceMetadata(spaceId);

  if (isLoading || !space) {
    return null; // Suspense will show skeleton
  }

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left side - Back button and title */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button 
              onClick={() => router.push(`/workspace/${workspaceId}`)} 
              className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0 mt-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{space.name}</h1>
                <Badge className={space.status === 'inactive' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400' : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'}>
                  {space.status === 'inactive' ? 'Inactive' : 'Active'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {space.description || 'Collaborative workspace for team projects'}
              </p>
            </div>
          </div>
          
          {/* Right side - Admin actions */}
          {shouldShowAdminButtons && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4" />
                    <span className="ml-2 hidden sm:inline">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onInviteClick}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Members
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSettingsClick}>
                    <Settings className="w-4 h-4 mr-2" />
                    Space Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
